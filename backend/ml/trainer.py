
"""
HealthCopilot AI - Model Training Engine

Dataset:
    D:\\archive (2) (1).zip
    Training.csv
    Testing.csv

Model:
    TF-IDF + Random Forest

Important:
    Original dataset rows are preserved.
    Duplicate symptom combinations are NOT removed.
    Testing.csv is kept separate from model fitting.
"""

import io
import json
import logging
import zipfile
from pathlib import Path

import joblib
import numpy as np
import pandas as pd

from sklearn.ensemble import RandomForestClassifier
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    precision_score,
    recall_score,
    f1_score,
)

from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import LabelEncoder


logger = logging.getLogger(__name__)


# =========================================================
# PATHS
# =========================================================

BASE_DIR = Path(__file__).resolve().parent.parent

DATA_DIR = BASE_DIR.parent / "datasets"
MODEL_DIR = BASE_DIR.parent / "trained_models"

DATA_DIR.mkdir(parents=True, exist_ok=True)
MODEL_DIR.mkdir(parents=True, exist_ok=True)

ZIP_DATASET_PATH = Path(r"D:\archive (2) (1).zip")

MODEL_PATH = MODEL_DIR / "symptom_classifier.pkl"
ENCODER_PATH = MODEL_DIR / "label_encoder.pkl"
META_PATH = MODEL_DIR / "model_meta.json"


# =========================================================
# SPECIALIST MAPPING
# =========================================================

SPECIALIST_MAP = {
    "Fungal infection": "Dermatologist",
    "Allergy": "Allergist",
    "GERD": "Gastroenterologist",
    "Chronic cholestasis": "Gastroenterologist",
    "Drug Reaction": "General Physician",
    "Peptic ulcer diseae": "Gastroenterologist",
    "Peptic ulcer disease": "Gastroenterologist",
    "AIDS": "Infectious Disease Specialist",
    "Diabetes": "Endocrinologist",
    "Gastroenteritis": "Gastroenterologist",
    "Bronchial Asthma": "Pulmonologist",
    "Hypertension": "Cardiologist",
    "Migraine": "Neurologist",
    "Cervical spondylosis": "Orthopedic",
    "Paralysis (brain hemorrhage)": "Neurologist",
    "Jaundice": "Gastroenterologist",
    "Malaria": "Infectious Disease Specialist",
    "Chicken pox": "Dermatologist",
    "Dengue": "General Physician",
    "Typhoid": "General Physician",
    "Hepatitis A": "Gastroenterologist",
    "Hepatitis B": "Gastroenterologist",
    "Hepatitis C": "Gastroenterologist",
    "Hepatitis D": "Gastroenterologist",
    "Hepatitis E": "Gastroenterologist",
    "Alcoholic hepatitis": "Gastroenterologist",
    "Tuberculosis": "Pulmonologist",
    "Common Cold": "General Physician",
    "Pneumonia": "Pulmonologist",
    "Dimorphic hemmorhoids(piles)": "Proctologist",
    "Heart attack": "Cardiologist",
    "Varicose veins": "Vascular Surgeon",
    "Hypothyroidism": "Endocrinologist",
    "Hyperthyroidism": "Endocrinologist",
    "Hypoglycemia": "Endocrinologist",
    "Osteoarthritis": "Orthopedic",
    "Osteoarthristis": "Orthopedic",
    "Arthritis": "Rheumatologist",
    "Vertigo": "ENT Specialist",
    "(vertigo) Paroymsal  Positional Vertigo": "ENT Specialist",
    "Acne": "Dermatologist",
    "Urinary tract infection": "Urologist",
    "Psoriasis": "Dermatologist",
    "Impetigo": "Dermatologist",
    "Influenza": "General Physician",
    "COVID-19": "General Physician",
}


# =========================================================
# TEXT CLEANING
# =========================================================

def clean_text(value):
    """Normalize symptom text."""

    if value is None:
        return ""

    try:
        if pd.isna(value):
            return ""
    except (TypeError, ValueError):
        pass

    text = str(value).strip().lower()

    if text in {"", "nan", "none", "null", "na", "n/a"}:
        return ""

    text = text.replace("_", " ")
    text = text.replace("-", " ")
    text = " ".join(text.split())

    return text


# =========================================================
# FIND DISEASE COLUMN
# =========================================================

def _find_label_column(df):

    candidates = [
        "prognosis",
        "disease",
        "diagnosis",
        "label",
        "class",
        "target",
    ]

    columns = {
        str(col).strip().lower(): col
        for col in df.columns
    }

    for candidate in candidates:
        if candidate in columns:
            return columns[candidate]

    for col in df.columns:
        name = str(col).strip().lower()

        if any(word in name for word in (
            "disease",
            "prognosis",
            "diagnosis",
            "label",
        )):
            return col

    raise ValueError(
        "Disease column not found. "
        f"Columns available: {list(df.columns)}"
    )


# =========================================================
# CONVERT CSV TO SYMPTOM TEXT
# =========================================================

def _dataframe_to_records(df):
    """
    Supports:
    1. Symptom_1, Symptom_2 columns containing symptom names.
    2. One-hot format where column names represent symptoms.
    3. Text/description columns.
    """

    if df.empty:
        raise ValueError("CSV dataset is empty.")

    label_column = _find_label_column(df)

    symptom_columns = [
        col for col in df.columns
        if col != label_column
        and not str(col).strip().lower().startswith("unnamed")
    ]

    if not symptom_columns:
        raise ValueError("No symptom columns found.")

    all_values = pd.Series(
        df[symptom_columns].values.ravel()
    ).dropna()

    normalized_values = set(
        all_values.astype(str).str.strip().str.lower().unique()
    )

    binary_values = {
        "0", "1", "0.0", "1.0",
        "true", "false"
    }

    is_one_hot = (
        len(normalized_values) > 0
        and normalized_values.issubset(binary_values)
    )

    logger.info(
        "Dataset format detected: %s",
        "one-hot encoded" if is_one_hot else "symptom text"
    )

    records = []

    for _, row in df.iterrows():

        disease = str(row[label_column]).strip()

        if not clean_text(disease):
            continue

        symptoms = []

        for column in symptom_columns:

            value = row[column]

            if pd.isna(value):
                continue

            if is_one_hot:

                present = str(value).strip().lower() in {
                    "1", "1.0", "true"
                }

                if present:
                    symptom = clean_text(column)

                    if symptom and not symptom.startswith("unnamed"):
                        symptoms.append(symptom)

            else:

                symptom = clean_text(value)

                if symptom:
                    symptoms.append(symptom)

        symptom_text = clean_text(" ".join(symptoms))

        if symptom_text:
            records.append({
                "text": symptom_text,
                "disease": disease,
            })

    result = pd.DataFrame(
        records,
        columns=["text", "disease"]
    )

    if result.empty:
        raise ValueError(
            "No symptom records could be created. "
            "The CSV format may need a specific loader."
        )

    return result


# =========================================================
# LOAD ZIP DATASET
# =========================================================

def _find_zip_member(archive, filename):

    for member in archive.namelist():

        if Path(member).name.lower() == filename.lower():
            return member

    return None


def _load_zip_datasets():

    if not ZIP_DATASET_PATH.exists():
        logger.warning(
            "Dataset ZIP not found: %s",
            ZIP_DATASET_PATH
        )
        return None, None

    logger.info("Reading dataset ZIP: %s", ZIP_DATASET_PATH)

    with zipfile.ZipFile(ZIP_DATASET_PATH, "r") as archive:

        training_file = _find_zip_member(
            archive, "Training.csv"
        )

        testing_file = _find_zip_member(
            archive, "Testing.csv"
        )

        if not training_file:
            raise FileNotFoundError(
                "Training.csv missing from ZIP."
            )

        if not testing_file:
            raise FileNotFoundError(
                "Testing.csv missing from ZIP."
            )

        training_bytes = archive.read(training_file)
        testing_bytes = archive.read(testing_file)

    raw_training = pd.read_csv(
        io.BytesIO(training_bytes)
    )

    raw_testing = pd.read_csv(
        io.BytesIO(testing_bytes)
    )

    training_df = _dataframe_to_records(raw_training)
    testing_df = _dataframe_to_records(raw_testing)

    # IMPORTANT:
    # Preserve all original converted rows.
    # Do not remove duplicate symptom combinations.

    training_df = training_df.reset_index(drop=True)
    testing_df = testing_df.reset_index(drop=True)

    logger.info(
        "Original training CSV rows: %d",
        len(raw_training)
    )

    logger.info(
        "Converted training records: %d",
        len(training_df)
    )

    logger.info(
        "Converted testing records: %d",
        len(testing_df)
    )

    return training_df, testing_df


# =========================================================
# LOCAL DATASET FALLBACK
# =========================================================

def _load_local_datasets():

    if not DATA_DIR.exists():
        return None

    datasets = []

    for csv_file in DATA_DIR.rglob("*.csv"):

        try:
            raw_df = pd.read_csv(csv_file)
            converted = _dataframe_to_records(raw_df)

            if not converted.empty:
                datasets.append(converted)

        except Exception as exc:
            logger.warning(
                "Could not load %s: %s",
                csv_file,
                exc,
            )

    if not datasets:
        return None

    combined = pd.concat(
        datasets,
        ignore_index=True
    )

    return combined.reset_index(drop=True)


# =========================================================
# BUILT-IN FALLBACK
# =========================================================

def _builtin_dataset():

    examples = {
        "Common Cold": [
            "sneezing runny nose cough nasal congestion",
            "sore throat sneezing mild fever",
        ],
        "Influenza": [
            "high fever chills cough body ache fatigue",
            "fever headache muscle pain chills",
        ],
        "Migraine": [
            "severe headache nausea sensitivity to light",
            "one sided headache vomiting",
        ],
        "Gastroenteritis": [
            "diarrhoea vomiting stomach pain nausea",
            "loose motion abdominal cramps vomiting",
        ],
        "Malaria": [
            "fever chills sweating headache",
            "recurrent fever shivering sweating",
        ],
        "Dengue": [
            "high fever joint pain muscle pain headache",
            "fever skin rash pain behind eyes",
        ],
        "Diabetes": [
            "increased thirst frequent urination weight loss",
            "excessive hunger fatigue frequent urination",
        ],
        "Pneumonia": [
            "cough chest pain fever difficulty breathing",
            "fever cough shortness of breath",
        ],
        "Bronchial Asthma": [
            "wheezing breathlessness chest tightness cough",
            "difficulty breathing wheezing cough",
        ],
        "GERD": [
            "heartburn acid reflux chest discomfort",
            "burning sensation after eating acid reflux",
        ],
    }

    records = []

    for disease, phrases in examples.items():

        for phrase in phrases:

            records.append({
                "text": phrase,
                "disease": disease,
            })

    return pd.DataFrame(records)


# =========================================================
# PUBLIC DATA LOADER
# =========================================================

def load_training_data():

    training_df, testing_df = _load_zip_datasets()

    if training_df is not None:

        training_df.attrs["dataset_source"] = str(
            ZIP_DATASET_PATH
        )

        training_df.attrs["external_test_df"] = testing_df

        return training_df

    local_df = _load_local_datasets()

    if local_df is not None:

        local_df.attrs["dataset_source"] = "local_datasets_folder"
        local_df.attrs["external_test_df"] = None

        return local_df

    logger.warning(
        "External dataset unavailable. Using small fallback dataset."
    )

    fallback = _builtin_dataset()

    fallback.attrs["dataset_source"] = "built_in_fallback"
    fallback.attrs["external_test_df"] = None

    return fallback


# =========================================================
# TRAIN MODEL
# =========================================================

def train_model():

    logger.info("=" * 55)
    logger.info("HEALTHCOPILOT AI MODEL TRAINING")
    logger.info("=" * 55)

    df = load_training_data()

    dataset_source = df.attrs.get(
        "dataset_source",
        "unknown"
    )

    external_test_df = df.attrs.get(
        "external_test_df"
    )

    df = df.copy()

    df["text"] = df["text"].apply(clean_text)
    df["disease"] = df["disease"].astype(str).str.strip()

    # Remove only invalid records.
    # Preserve legitimate repeated training examples.
    df = df[
        (df["text"] != "")
        & (df["disease"] != "")
    ].reset_index(drop=True)

    if df.empty:
        raise ValueError("No valid training records found.")

    label_encoder = LabelEncoder()

    y_all = label_encoder.fit_transform(df["disease"])
    X_all = df["text"].values

    class_count = len(label_encoder.classes_)

    if class_count < 2:
        raise ValueError(
            "At least two disease classes are required."
        )

    logger.info("Dataset source: %s", dataset_source)
    logger.info("Training records: %d", len(df))
    logger.info("Disease classes: %d", class_count)

    # -----------------------------------------------------
    # SEPARATE TEST DATASET
    # -----------------------------------------------------

    if external_test_df is not None and not external_test_df.empty:

        logger.info("Using external Testing.csv.")

        test_df = external_test_df.copy()

        test_df["text"] = test_df["text"].apply(clean_text)
        test_df["disease"] = (
            test_df["disease"].astype(str).str.strip()
        )

        known_classes = set(label_encoder.classes_)

        test_df = test_df[
            test_df["disease"].isin(known_classes)
            & (test_df["text"] != "")
        ].reset_index(drop=True)

        if test_df.empty:
            raise ValueError(
                "No matching disease labels found in Testing.csv."
            )

        X_train = X_all
        y_train = y_all

        X_test = test_df["text"].values

        y_test = label_encoder.transform(
            test_df["disease"]
        )

        evaluation_note = (
            "Evaluated on separate Testing.csv. "
            "Test data was not used for fitting."
        )

    else:

        logger.info("Using internal train/test split.")

        indices = np.arange(len(df))

        counts = pd.Series(y_all).value_counts()

        stratify = (
            y_all
            if len(df) >= 10 and counts.min() >= 2
            else None
        )

        test_count = max(
            int(np.ceil(len(df) * 0.2)),
            class_count
        )

        if test_count >= len(df):
            test_count = max(
                1,
                int(len(df) * 0.2)
            )

        if test_count <= 0 or test_count >= len(df):
            raise ValueError(
                "Insufficient records for train/test split."
            )

        train_indices, test_indices = train_test_split(
            indices,
            test_size=test_count,
            random_state=42,
            stratify=stratify,
        )

        X_train = X_all[train_indices]
        X_test = X_all[test_indices]

        y_train = y_all[train_indices]
        y_test = y_all[test_indices]

        evaluation_note = (
            "Evaluated using internal train/test split."
        )

    # -----------------------------------------------------
    # TF-IDF + RANDOM FOREST
    # -----------------------------------------------------

    model = Pipeline([
        (
            "tfidf",
            TfidfVectorizer(
                lowercase=True,
                ngram_range=(1, 2),
                max_features=12000,
                strip_accents="unicode",
                sublinear_tf=True,
                token_pattern=r"(?u)\b\w+\b",
            )
        ),
        (
            "classifier",
            RandomForestClassifier(
                n_estimators=200,
                random_state=42,
                class_weight="balanced",
                n_jobs=-1,
            )
        )
    ])

    logger.info("Training TF-IDF + Random Forest...")

    model.fit(X_train, y_train)

    # -----------------------------------------------------
    # EVALUATION
    # -----------------------------------------------------

    predictions = model.predict(X_test)

    accuracy = accuracy_score(
        y_test,
        predictions
    )

    precision = precision_score(
        y_test,
        predictions,
        average="weighted",
        zero_division=0,
    )

    recall = recall_score(
        y_test,
        predictions,
        average="weighted",
        zero_division=0,
    )

    f1 = f1_score(
        y_test,
        predictions,
        average="weighted",
        zero_division=0,
    )

    all_labels = np.arange(class_count)

    report = classification_report(
        y_test,
        predictions,
        labels=all_labels,
        target_names=label_encoder.classes_,
        output_dict=True,
        zero_division=0,
    )

    matrix = confusion_matrix(
        y_test,
        predictions,
        labels=all_labels,
    )

    # -----------------------------------------------------
    # SAVE MODEL
    # -----------------------------------------------------

    joblib.dump(model, MODEL_PATH)
    joblib.dump(label_encoder, ENCODER_PATH)

    metadata = {
        "model_name": "TF-IDF + Random Forest",
        "dataset_source": dataset_source,
        "evaluation_note": evaluation_note,
        "accuracy": float(accuracy),
        "precision": float(precision),
        "recall": float(recall),
        "f1_score": float(f1),
        "n_classes": int(class_count),
        "classes": label_encoder.classes_.tolist(),
        "train_samples": int(len(X_train)),
        "test_samples": int(len(X_test)),
        "specialist_map": SPECIALIST_MAP,
        "classification_report": report,
        "confusion_matrix": matrix.tolist(),
        "model_path": str(MODEL_PATH),
        "encoder_path": str(ENCODER_PATH),
    }

    with open(
        META_PATH,
        "w",
        encoding="utf-8"
    ) as file:

        json.dump(
            metadata,
            file,
            indent=4,
            ensure_ascii=False,
        )

    # -----------------------------------------------------
    # RESULTS
    # -----------------------------------------------------

    logger.info("=" * 55)
    logger.info("TRAINING COMPLETED")
    logger.info("Dataset: %s", dataset_source)
    logger.info("Training samples: %d", len(X_train))
    logger.info("Testing samples: %d", len(X_test))
    logger.info("Classes: %d", class_count)
    logger.info("Accuracy: %.4f", accuracy)
    logger.info("Precision: %.4f", precision)
    logger.info("Recall: %.4f", recall)
    logger.info("F1 Score: %.4f", f1)
    logger.info("Model saved: %s", MODEL_PATH)
    logger.info("=" * 55)

    return {
        "success": True,
        "model_name": "TF-IDF + Random Forest",
        "dataset_source": dataset_source,
        "accuracy": float(accuracy),
        "precision": float(precision),
        "recall": float(recall),
        "f1_score": float(f1),
        "n_classes": int(class_count),
        "train_samples": int(len(X_train)),
        "test_samples": int(len(X_test)),
        "model_path": str(MODEL_PATH),
        "metadata_path": str(META_PATH),
        "evaluation_note": evaluation_note,
    }


# =========================================================
# COMPATIBILITY FUNCTIONS
# =========================================================

def download_datasets():

    if ZIP_DATASET_PATH.exists():
        logger.info("Local dataset ZIP found.")
        return True

    logger.warning("Dataset ZIP not found.")
    return False


def is_trained():

    return (
        MODEL_PATH.exists()
        and ENCODER_PATH.exists()
        and META_PATH.exists()
    )
