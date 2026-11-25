
import json
import logging
import re
from pathlib import Path

from ml.symptom_normalizer import normalize as normalize_symptoms

logger = logging.getLogger(__name__)

BASE_DIR = Path(__file__).resolve().parent.parent
MODEL_DIR = BASE_DIR.parent / "trained_models"

MODEL_PATH = MODEL_DIR / "symptom_classifier.pkl"
ENCODER_PATH = MODEL_DIR / "label_encoder.pkl"
META_PATH = MODEL_DIR / "model_meta.json"


KNOWN_SYMPTOMS = {
    "itching", "skin rash", "nodal skin eruptions",
    "continuous sneezing", "shivering", "chills",
    "joint pain", "stomach pain", "acidity", "vomiting",
    "burning micturition", "fatigue", "weight gain",
    "anxiety", "weight loss", "restlessness", "lethargy",
    "patches in throat", "irregular sugar level",
    "high fever", "mild fever", "fever", "sunken eyes",
    "breathlessness", "sweating", "dehydration",
    "indigestion", "headache", "yellowish skin",
    "dark urine", "nausea", "loss of appetite",
    "pain behind the eyes", "back pain", "constipation",
    "abdominal pain", "diarrhoea", "yellow urine",
    "yellowing of eyes", "acute liver failure",
    "fluid overload", "swelling of stomach",
    "swelled lymph nodes", "malaise",
    "blurred and distorted vision", "phlegm",
    "throat irritation", "redness of eyes",
    "sinus pressure", "runny nose", "congestion",
    "chest pain", "weakness in limbs", "fast heart rate",
    "pain during bowel movements", "pain in anal region",
    "bloody stool", "irritation in anus", "neck pain",
    "dizziness", "cramps", "bruising", "obesity",
    "swollen legs", "swollen blood vessels",
    "puffy face and eyes", "enlarged thyroid",
    "brittle nails", "swollen extremeties",
    "excessive hunger", "slurred speech", "knee pain",
    "hip joint pain", "muscle weakness", "muscle wasting",
    "stiff neck", "swelling joints", "movement stiffness",
    "spinning movements", "loss of balance",
    "unsteadiness", "weakness of one body side",
    "loss of smell", "bladder discomfort",
    "foul smell of urine", "continuous feel of urine",
    "passage of gases", "internal itching",
    "toxic look (typhos)", "depression", "irritability",
    "muscle pain", "altered sensorium",
    "red spots over body", "belly pain",
    "abnormal menstruation", "dischromic patches",
    "watering from eyes", "increased appetite",
    "polyuria", "family history", "mucoid sputum",
    "rusty sputum", "lack of concentration",
    "visual disturbances", "receiving blood transfusion",
    "receiving unsterile injections", "coma",
    "stomach bleeding", "distention of abdomen",
    "history of alcohol consumption", "blood in sputum",
    "prominent veins on calf", "palpitations",
    "painful walking", "pus filled pimples", "blackheads",
    "scurring", "skin peeling", "silver like dusting",
    "small dents in nails", "inflammatory nails",
    "blister", "red sore around nose", "yellow crust ooze",
    "cough", "hair loss",
}

MIN_RECOGNIZED_SYMPTOMS = 2
MIN_MODEL_SCORE = 0.50

# These warning symptoms trigger an emergency safety message.
# This is a conservative keyword check, not a complete triage system.
EMERGENCY_SYMPTOMS = {
    "chest pain",
    "breathlessness",
    "slurred speech",
    "weakness of one body side",
    "altered sensorium",
    "coma",
}


def contains_emergency_symptom(text: str) -> bool:
    """Check for configured emergency warning symptoms."""

    normalized = text.lower()

    for symptom in EMERGENCY_SYMPTOMS:
        pattern = (
            r"(?<!\w)"
            + r"\s+".join(re.escape(word) for word in symptom.split())
            + r"(?!\w)"
        )

        if re.search(pattern, normalized):
            return True

    return False


def count_recognized_symptoms(text: str) -> int:
    """Count distinct symptoms as whole words or phrases."""

    words = set(text.lower().split())

    found = {
        symptom for symptom in KNOWN_SYMPTOMS
        if " " not in symptom and symptom in words
    }

    for symptom in KNOWN_SYMPTOMS:
        if " " in symptom:
            pattern = r"(?<!\w)" + r"\s+".join(
                re.escape(word) for word in symptom.split()
            ) + r"(?!\w)"

            if re.search(pattern, text.lower()):
                found.add(symptom)

    return len(found)


RULE_BASED_MAP = {
    "cough": ("Possible respiratory condition", "General Physician"),
    "fever": ("Possible fever-related condition", "General Physician"),
    "headache": ("Possible headache-related condition", "General Physician"),
    "chest pain": ("Chest pain requires urgent assessment", "General Physician"),
    "rash": ("Possible skin condition", "Dermatologist"),
    "fatigue": ("Fatigue requiring assessment", "General Physician"),
    "nausea": ("Digestive condition requiring assessment", "General Physician"),
    "vomiting": ("Vomiting requiring assessment", "General Physician"),
    "shortness of breath": ("Breathing difficulty requiring urgent assessment", "Pulmonologist"),
    "breathlessness": ("Breathing difficulty requiring urgent assessment", "Pulmonologist"),
    "joint pain": ("Possible joint condition", "General Physician"),
    "back pain": ("Back pain requiring assessment", "General Physician"),
    "itching": ("Possible skin condition", "Dermatologist"),
    "yellowish skin": ("Yellowing of skin requiring assessment", "General Physician"),
    "polyuria": ("Frequent urination requiring assessment", "General Physician"),
}


class SymptomPredictor:

    def __init__(self):
        self._pipeline = None
        self._label_encoder = None
        self._meta = {}
        self._loaded = False

    def load(self) -> bool:
        try:
            import joblib

            if not MODEL_PATH.exists() or not ENCODER_PATH.exists():
                logger.warning("Trained model or label encoder not found.")
                return False

            self._pipeline = joblib.load(MODEL_PATH)
            self._label_encoder = joblib.load(ENCODER_PATH)

            if META_PATH.exists():
                with open(META_PATH, "r", encoding="utf-8") as file:
                    self._meta = json.load(file)

            self._loaded = True

            logger.info(
                "Symptom classifier loaded: %s classes, accuracy=%s",
                self._meta.get("n_classes", "?"),
                self._meta.get("accuracy", "unknown"),
            )

            return True

        except Exception:
            logger.exception("Failed to load symptom prediction model")
            self._loaded = False
            return False

    def _response(
        self,
        disease: str,
        confidence: float = 0.0,
        specialist: str = "General Physician",
        differentials: list | None = None,
        model: str = "insufficient_symptoms",
        low_confidence: bool = True,
        result_note: str = "",
    ) -> dict:

        return {
            "disease": disease,
            "confidence": round(float(confidence), 4),
            "specialist": specialist,
            "differentials": differentials or [],
            "model": model,
            "low_confidence": low_confidence,
            "result_note": result_note,
        }

    def predict(self, symptoms_text: str) -> dict:

        if not isinstance(symptoms_text, str) or not symptoms_text.strip():
            return self._response(
                disease="Please enter your symptoms",
                result_note="Please describe the symptoms you are experiencing.",
                model="input_validation",
            )

        normalized_text = normalize_symptoms(symptoms_text.strip().lower())

        logger.debug(
            "Original symptoms: %r | Normalized symptoms: %r",
            symptoms_text,
            normalized_text,
        )

        if not normalized_text:
            return self._response(
                disease="Please enter your symptoms",
                result_note="Please describe the symptoms you are experiencing.",
                model="input_validation",
            )

        # Emergency check runs before both ML prediction and fallback.
        if contains_emergency_symptom(normalized_text):
            return self._response(
                disease="Potential emergency symptoms detected",
                specialist="Emergency Services",
                model="emergency_safety_check",
                low_confidence=True,
                result_note=(
                    "One or more warning symptoms were reported. "
                    "Seek immediate medical assessment at the nearest "
                    "emergency department. If you are in India, call 112 "
                    "for emergency assistance when needed. Do not rely on "
                    "this application to assess or rule out an emergency."
                ),
            )

        if self._loaded and self._pipeline is not None:
            return self._ml_predict(normalized_text)

        return self._rule_predict(normalized_text)

    def _ml_predict(self, text: str) -> dict:

        try:
            symptom_count = count_recognized_symptoms(text)

            if symptom_count < MIN_RECOGNIZED_SYMPTOMS:
                return self._response(
                    disease="More symptom information needed",
                    model="insufficient_symptoms",
                    result_note=(
                        "Please describe at least two distinct recognized "
                        "symptoms, if present. You can also mention how long "
                        "you have experienced them. This tool cannot diagnose "
                        "a condition from limited information."
                    ),
                )

            probabilities = self._pipeline.predict_proba([text])[0]
            top_indices = probabilities.argsort()[::-1][:3]

            top_index = int(top_indices[0])
            confidence = float(probabilities[top_index])

            disease = str(
                self._label_encoder.inverse_transform([top_index])[0]
            )

            specialist_map = self._meta.get("specialist_map", {})
            specialist = specialist_map.get(
                disease, "General Physician"
            )

            differentials = []

            for index in top_indices:
                index = int(index)

                differentials.append({
                    "disease": str(
                        self._label_encoder.inverse_transform([index])[0]
                    ),
                    "confidence": round(float(probabilities[index]), 4),
                })

            low_confidence = confidence < MIN_MODEL_SCORE

            if low_confidence:
                result_note = (
                    "These are the model's three highest-ranked matches, "
                    "but confidence is low. They are experimental possibilities "
                    "only, not diagnoses. Please consult a qualified healthcare "
                    "professional for medical assessment."
                )
            else:
                result_note = (
                    "These are model-ranked possibilities based on the symptoms "
                    "provided. Model confidence is not clinical certainty. "
                    "This is not a confirmed diagnosis. Consult a qualified "
                    "healthcare professional."
                )

            return self._response(
                disease=disease,
                confidence=confidence,
                specialist=specialist,
                differentials=differentials,
                model="local_rf_v1",
                low_confidence=low_confidence,
                result_note=result_note,
            )

        except Exception:
            logger.exception("ML prediction failed")

            return self._response(
                disease="Prediction unavailable — please consult a physician",
                model="prediction_error",
                result_note="The prediction could not be completed.",
            )

    def _rule_predict(self, text: str) -> dict:

        for keyword, (description, specialist) in RULE_BASED_MAP.items():
            if keyword in text:
                return self._response(
                    disease=description,
                    specialist=specialist,
                    model="rule_based_fallback",
                    result_note=(
                        "This is a symptom-based fallback, not a disease "
                        "prediction. Please consult a physician."
                    ),
                )

        return self._response(
            disease="Symptoms require medical assessment",
            model="rule_based_fallback",
            result_note=(
                "This is a symptom-based fallback, not a disease "
                "prediction. Please consult a physician."
            ),
        )

    @property
    def is_loaded(self) -> bool:
        return self._loaded

    @property
    def model_info(self) -> dict:
        return {
            "loaded": self._loaded,
            "n_classes": self._meta.get("n_classes", 0),
            "accuracy": self._meta.get("accuracy", 0),
        }


predictor = SymptomPredictor()
