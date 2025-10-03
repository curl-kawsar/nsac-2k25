#!/usr/bin/env python3
"""
ML Dependencies Installation Script for CityWISE Platform
Installs required Python packages for ML model inference
"""

import subprocess
import sys
import os

def install_package(package):
    """Install a Python package using pip"""
    try:
        subprocess.check_call([sys.executable, "-m", "pip", "install", package])
        print(f"✓ Successfully installed {package}")
        return True
    except subprocess.CalledProcessError as e:
        print(f"✗ Failed to install {package}: {e}")
        return False

def check_python_version():
    """Check if Python version is compatible"""
    version = sys.version_info
    if version.major < 3 or (version.major == 3 and version.minor < 7):
        print("Error: Python 3.7 or higher is required")
        return False
    print(f"✓ Python {version.major}.{version.minor}.{version.micro} detected")
    return True

def main():
    print("CityWISE ML Dependencies Installation")
    print("=" * 40)
    
    # Check Python version
    if not check_python_version():
        sys.exit(1)
    
    # Required packages for ML model inference
    packages = [
        "numpy>=1.21.0",
        "scikit-learn>=1.0.0",
        "pandas>=1.3.0",
        "joblib>=1.1.0",
        "pickle5>=0.0.11; python_version<'3.8'",
    ]
    
    # Optional packages for enhanced functionality
    optional_packages = [
        "tensorflow>=2.8.0",  # For .h5 model loading
        "keras>=2.8.0",       # For Keras models
        "matplotlib>=3.5.0",  # For visualization
        "seaborn>=0.11.0",    # For enhanced plotting
    ]
    
    print("\nInstalling required packages...")
    failed_packages = []
    
    for package in packages:
        if not install_package(package):
            failed_packages.append(package)
    
    print("\nInstalling optional packages...")
    for package in optional_packages:
        install_package(package)  # Don't fail if optional packages fail
    
    print("\n" + "=" * 40)
    
    if failed_packages:
        print("⚠️  Some required packages failed to install:")
        for package in failed_packages:
            print(f"   - {package}")
        print("\nThe ML models may not work properly without these packages.")
        print("Please install them manually or check your Python environment.")
        sys.exit(1)
    else:
        print("✅ All required ML dependencies installed successfully!")
        print("\nYou can now use the trained ML models in the CityWISE platform:")
        print("   - Air Quality Predictor (air_quality_predictor.pkl)")
        print("   - Healthcare Priority Model (healthcare_priority_model.h5)")
        print("   - Healthcare Scaler (healthcare_scaler.pkl)")
        
    print("\nTo test the installation, run:")
    print("   python -c \"import sklearn, numpy, pandas; print('ML dependencies ready!')\"")

if __name__ == "__main__":
    main()
