
import zipfile
import pandas as pd
import io

with zipfile.ZipFile(r"D:\archive (2) (1).zip") as z:
    df = pd.read_csv(io.BytesIO(z.read("Training.csv")))

    print("LAST 6 COLUMNS:")
    print(df.iloc[:, -6:].head(5).to_string())

    print("\nNON-EMPTY VALUES IN LAST 6 COLUMNS:")
    print(df.iloc[:, -6:].count().to_string())

    print("\nCOLUMN NAMES:")
    print(df.columns[-6:].tolist())
