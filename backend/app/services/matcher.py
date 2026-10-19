import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
import tensorflow as tf
from tensorflow.keras.applications import MobileNetV2
from tensorflow.keras.applications.mobilenet_v2 import preprocess_input
from tensorflow.keras.preprocessing import image

# Load model once when the server starts
model = MobileNetV2(weights='imagenet', include_top=False, pooling='avg')

class SimilarityMatcher:
    def __init__(self, threshold=0.85):
        self.threshold = threshold

    def find_matches(self, new_image_vector, database_vectors):
        if len(database_vectors) == 0:
            return []

        new_vec_2d = new_image_vector.reshape(1, -1)
        db_vecs_2d = np.array(database_vectors)

        similarities = cosine_similarity(new_vec_2d, db_vecs_2d)[0]

        matches = []
        for index, score in enumerate(similarities):
            if score >= self.threshold:
                matches.append({
                    "database_index": index,
                    "similarity_score": float(score)
                })

        matches.sort(key=lambda x: x["similarity_score"], reverse=True)
        return matches

# --- INSTRUCTOR'S REQUESTED FUNCTIONS ---

def get_image_vector(img_path: str):
    """Helper function to get the 1D array of features."""
    img = image.load_img(img_path, target_size=(224, 224))
    img_array = image.img_to_array(img)
    img_array = np.expand_dims(img_array, axis=0)
    img_array = preprocess_input(img_array)
    
    features = model.predict(img_array)
    return features

def compare_images(path1: str, path2: str) -> float:
    """Returns a similarity score between 0.0 and 1.0"""
    try:
        vec1 = get_image_vector(path1)
        vec2 = get_image_vector(path2)
        
        score = cosine_similarity(vec1, vec2)[0][0]
        return float(score)
    except Exception as e:
        print(f"Error comparing images: {e}")
        return 0.0