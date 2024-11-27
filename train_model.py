import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression
import json
from skl2onnx import convert_sklearn
from skl2onnx.common.data_types import FloatTensorType
import onnx
from sklearn.metrics import classification_report, confusion_matrix
import seaborn as sns
import matplotlib.pyplot as plt
from sklearn.ensemble import RandomForestClassifier


# Read the data
df = pd.read_csv('train.csv')

# Prepare features (X) and target (y)
X = df.drop(['ID', 'is_gitelman'], axis=1)
y = df['is_gitelman']

# Split the data
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# Scale the features
scaler = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled = scaler.transform(X_test)

# Create and train the model
rf_model = RandomForestClassifier(n_estimators=100, random_state=42)
rf_model.fit(X_train_scaled, y_train)

# Make predictions
y_pred = rf_model.predict(X_test_scaled)

# Print model performance
print("Classification Report:")
print(classification_report(y_test, y_pred))

# Feature importance
feature_importance = pd.DataFrame({
    'feature': X.columns,
    'importance': rf_model.feature_importances_
})
feature_importance = feature_importance.sort_values('importance', ascending=False)

# Plot feature importance
plt.figure(figsize=(10, 6))
sns.barplot(x='importance', y='feature', data=feature_importance)
plt.title('Feature Importance')
plt.show()

# Print confusion matrix
print("\nConfusion Matrix:")
print(confusion_matrix(y_test, y_pred))

# Save scaler parameters
scaler_params = {
    'mean_': scaler.mean_.tolist(),
    'scale_': scaler.scale_.tolist()
}
with open('./static/scaler_params.json', 'w') as f:
    json.dump(scaler_params, f)

# Convert and save model to ONNX
initial_type = [('float_input', FloatTensorType([None, 5]))]
onx = convert_sklearn(rf_model, initial_types=initial_type)

# Set IR version to 7 (widely supported)
onx.ir_version = 7

# Save the model
with open("./static/model.onnx", "wb") as f:
    f.write(onx.SerializeToString())

# Verify the IR version
loaded_model = onnx.load("./static/model.onnx")
print(f"Saved model IR version: {loaded_model.ir_version}")

# Print model performance metrics
from sklearn.metrics import classification_report
y_pred = rf_model.predict(X_test_scaled)
print("\nModel Performance:")
print(classification_report(y_test, y_pred))