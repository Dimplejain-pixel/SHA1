
import re

# Canonical symptom names based on the actual Training.csv features.
# Underscores are converted to spaces because that is the trainer format.

SYMPTOM_MAP = [
    # Fever and temperature
    ("high grade fever", "high_fever"),
    ("high fever", "high_fever"),
    ("mild fever", "mild_fever"),
    ("low grade fever", "mild_fever"),
    ("fever", "fever"),
    ("shivering", "shivering"),
    ("chills", "chills"),
    ("night sweats", "sweating"),
    ("sweating", "sweating"),

    # Respiratory
    ("shortness of breath", "breathlessness"),
    ("difficulty breathing", "breathlessness"),
    ("breathing difficulty", "breathlessness"),
    ("trouble breathing", "breathlessness"),
    ("breathlessness", "breathlessness"),
    ("dry cough", "cough"),
    ("wet cough", "cough"),
    ("productive cough", "cough"),
    ("persistent cough", "cough"),
    ("coughing", "cough"),
    ("cough", "cough"),
    ("sore throat", "throat_irritation"),
    ("throat pain", "throat_irritation"),
    ("throat irritation", "throat_irritation"),
    ("patches in throat", "patches in throat"),
    ("runny nose", "runny_nose"),
    ("blocked nose", "congestion"),
    ("stuffy nose", "congestion"),
    ("nasal congestion", "congestion"),
    ("continuous sneezing", "continuous_sneezing"),
    ("sneezing", "continuous_sneezing"),
    ("loss of smell", "loss_of_smell"),
    ("phlegm", "phlegm"),
    ("mucus", "phlegm"),
    ("blood in sputum", "blood_in_sputum"),
    ("coughing blood", "blood_in_sputum"),

    # Head and neurological
    ("severe headache", "headache"),
    ("head pain", "headache"),
    ("headache", "headache"),
    ("dizziness", "dizziness"),
    ("lightheadedness", "dizziness"),
    ("spinning sensation", "spinning_movements"),
    ("spinning movements", "spinning_movements"),
    ("blurred vision", "blurred_and_distorted_vision"),
    ("blurred eyesight", "blurred_and_distorted_vision"),
    ("confusion", "altered_sensorium"),
    ("loss of balance", "loss_of_balance"),
    ("unsteadiness", "unsteadiness"),
    ("weakness on one side", "weakness_of_one_body_side"),
    ("weakness of one side", "weakness_of_one_body_side"),
    ("slurred speech", "slurred_speech"),

    # Digestive
    ("stomach pain", "stomach_pain"),
    ("abdominal pain", "abdominal_pain"),
    ("belly pain", "belly_pain"),
    ("stomach ache", "stomach_pain"),
    ("abdominal discomfort", "abdominal_pain"),
    ("feeling nauseous", "nausea"),
    ("nausea", "nausea"),
    ("throwing up", "vomiting"),
    ("vomiting", "vomiting"),
    ("loose motions", "diarrhoea"),
    ("loose motion", "diarrhoea"),
    ("diarrhea", "diarrhoea"),
    ("diarrhoea", "diarrhoea"),
    ("constipation", "constipation"),
    ("bloated stomach", "distention_of_abdomen"),
    ("stomach bloating", "distention_of_abdomen"),
    ("bloating", "distention_of_abdomen"),
    ("excess gas", "passage_of_gases"),
    ("gas problem", "passage_of_gases"),
    ("heartburn", "acidity"),
    ("acid reflux", "acidity"),
    ("acidity", "acidity"),
    ("indigestion", "indigestion"),
    ("loss of appetite", "loss_of_appetite"),
    ("poor appetite", "loss_of_appetite"),
    ("stomach bleeding", "stomach_bleeding"),
    ("bloody stool", "bloody_stool"),

    # Pain and muscles
    ("lower back pain", "back_pain"),
    ("body pain", "muscle_pain"),
    ("body aches", "muscle_pain"),
    ("muscle aches", "muscle_pain"),
    ("muscle pain", "muscle_pain"),
    ("muscle wasting", "muscle wasting"),
    ("joint pain", "joint_pain"),
    ("pain in joints", "joint_pain"),
    ("back pain", "back_pain"),
    ("neck pain", "neck_pain"),
    ("chest pain", "chest_pain"),
    ("muscle weakness", "muscle_weakness"),
    ("muscle cramps", "cramps"),
    ("cramps", "cramps"),
    ("joint swelling", "swelling_joints"),
    ("stiff neck", "stiff_neck"),
    ("painful walking", "painful_walking"),

    # Skin and hair
    ("patchy hair loss", "hair_loss"),
    ("hair loss", "hair_loss"),
    ("skin rash", "skin_rash"),
    ("rash", "skin_rash"),
    ("itchy skin", "itching"),
    ("skin itching", "itching"),
    ("itching", "itching"),
    ("yellowish skin", "yellowish_skin"),
    ("yellow skin", "yellowish_skin"),
    ("skin peeling", "skin_peeling"),
    ("red spots over body", "red_spots_over_body"),
    ("red spots", "red_spots_over_body"),
    ("pus filled pimples", "pus_filled_pimples"),
    ("blackheads", "blackheads"),
    ("blisters", "blister"),
    ("blister", "blister"),

    # Urinary
    ("frequent urination", "polyuria"),
    ("urinating frequently", "polyuria"),
    ("excessive urination", "polyuria"),
    ("burning while urinating", "burning_micturition"),
    ("painful urination", "burning_micturition"),
    ("burning urination", "burning_micturition"),
    ("blood in urine", "bladder_discomfort"),
    ("dark urine", "dark_urine"),
    ("yellow urine", "yellow_urine"),
    ("reduced urine", "oliguria"),
    ("foul smelling urine", "foul_smell_of_urine"),

    # General symptoms
    ("unexplained weight loss", "weight_loss"),
    ("extreme fatigue", "fatigue"),
    ("feeling tired", "fatigue"),
    ("tiredness", "fatigue"),
    ("fatigue", "fatigue"),
    ("general weakness", "weakness_in_limbs"),
    ("weakness", "weakness_in_limbs"),
    ("weight loss", "weight_loss"),
    ("weight gain", "weight_gain"),
    ("swollen lymph nodes", "swelled_lymph_nodes"),
    ("swollen glands", "swelled_lymph_nodes"),
    ("dehydration", "dehydration"),
    ("excessive hunger", "excessive_hunger"),
    ("increased hunger", "excessive_hunger"),
    ("increased appetite", "increased_appetite"),
    ("irregular sugar level", "irregular_sugar_level"),
    ("fast heartbeat", "fast_heart_rate"),
    ("rapid heartbeat", "fast_heart_rate"),
    ("palpitations", "palpitations"),
]

STOP_WORDS = {
    "i", "am", "is", "are", "was", "were", "have", "has", "had",
    "the", "a", "an", "and", "or", "but", "my", "me", "with",
    "of", "to", "for", "in", "on", "at", "this", "that",
    "feeling", "feel", "experiencing", "suffering", "from",
    "having", "been", "being", "it", "there", "patient",
    "day", "days", "week", "weeks", "month", "months",
    "yesterday", "today", "ago", "since", "last", "past",
    "please", "also", "some", "very", "currently", "about",
    "then", "now", "myself",
}

NEGATION_WORDS = (
    r"(?:no|not|without|denies|denied|never|"
    r"don't|do not|doesn't|does not|didn't|did not)"
)

_SORTED_MAP = sorted(
    [
        (phrase.lower().strip(), term.replace("_", " "))
        for phrase, term in SYMPTOM_MAP
    ],
    key=lambda item: len(item[0]),
    reverse=True,
)


def remove_duration(text: str) -> str:
    """Remove duration expressions, which are not dataset features."""

    number = (
        r"(?:\d+|one|two|three|four|five|six|seven|eight|nine|ten)"
    )
    unit = r"(?:hours?|days?|weeks?|months?)"

    patterns = [
        rf"\b(?:for|from|since)\s+(?:the\s+)?"
        rf"(?:(?:last|past)\s+)?{number}\s+{unit}\b",
        r"\b(?:since|from)\s+(?:yesterday|today|last night|"
        r"this morning|last evening)\b",
        r"\bfor\s+(?:the\s+)?(?:last|past)\s+"
        r"(?:few|several)\s+(?:days?|weeks?|months?)\b",
    ]

    for pattern in patterns:
        text = re.sub(pattern, " ", text)

    return re.sub(r"\s+", " ", text).strip()


def remove_negated_symptoms(text: str) -> str:
    """Remove explicitly denied symptoms before positive symptom mapping."""

    for phrase, _ in _SORTED_MAP:
        phrase_pattern = r"\s+".join(
            re.escape(word) for word in phrase.split()
        )

        pattern = (
            rf"\b{NEGATION_WORDS}\s+"
            rf"(?:(?:have|having|experiencing|feeling|"
            rf"suffering\s+from|any)\s+)*"
            rf"{phrase_pattern}\b"
        )

        text = re.sub(pattern, " ", text)

    return re.sub(r"\s+", " ", text).strip()


def normalize(text: str) -> str:
    """Convert natural-language descriptions into model-compatible text."""

    if not isinstance(text, str) or not text.strip():
        return ""

    text = text.lower().strip()
    text = re.sub(r"[^a-z0-9\s]", " ", text)
    text = re.sub(r"\s+", " ", text)

    text = remove_duration(text)
    text = remove_negated_symptoms(text)

    replacements = []

    for index, (phrase, medical_term) in enumerate(_SORTED_MAP):
        pattern = (
            r"(?<!\w)"
            + r"\s+".join(
                re.escape(word) for word in phrase.split()
            )
            + r"(?!\w)"
        )

        placeholder = f"SYMPTOMPLACEHOLDER{index}END"
        text, count = re.subn(pattern, placeholder, text)

        if count:
            replacements.append((placeholder, medical_term))

    for placeholder, medical_term in replacements:
        text = text.replace(placeholder, medical_term)

    # Protect this multi-word dataset feature from stop-word removal.
    protected_features = {
        "patches in throat": "PATCHESINTHROATFEATURETOKEN"
    }

    for feature, token in protected_features.items():
        pattern = (
            r"(?<!\w)"
            + r"\s+".join(re.escape(word) for word in feature.split())
            + r"(?!\w)"
        )
        text = re.sub(pattern, token, text)

    words = [
        word for word in text.split()
        if word not in STOP_WORDS
    ]

    normalized = " ".join(words)

    for feature, token in protected_features.items():
        normalized = normalized.replace(token, feature)

    return normalized.strip()
