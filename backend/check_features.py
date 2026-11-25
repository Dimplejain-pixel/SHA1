
import zipfile
import pandas as pd
import io
import re

from ml.symptom_normalizer import SYMPTOM_MAP

zip_path = r"D:\archive (2) (1).zip"

with zipfile.ZipFile(zip_path) as z:
    df = pd.read_csv(io.BytesIO(z.read("Training.csv")))

dataset_features = set(df.columns[:-2])

mapped_terms = set()

for phrase, terms in SYMPTOM_MAP:
    for term in terms.split():
        mapped_terms.add(term)

matched = mapped_terms.intersection(dataset_features)
missing = mapped_terms - dataset_features

print("TOTAL DATASET FEATURES:", len(dataset_features))
print("TOTAL NORMALIZER TERMS:", len(mapped_terms))
print("MATCHED TERMS:", len(matched))
print("TERMS NOT IN DATASET:", len(missing))

print("\nMATCHED TERMS:")
print(", ".join(sorted(matched)))

print("\nUNMATCHED TERMS:")
print(", ".join(sorted(missing)))
