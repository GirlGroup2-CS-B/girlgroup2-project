import numpy as np
from sklearn.metrics.pairwise import cosine_similarity

class SimilarityMatcher:
    def __init__(self, threshold=0.85):
        # The threshold determines how similar two images must be to count as a match.
        self.threshold = threshold

    def find_matches(self, new_image_vector, database_vectors):
        if len(database_vectors) == 0:
            return []

        # Reshape to 2D arrays because sklearn's cosine_similarity expects 2D
        new_vec_2d = new_image_vector.reshape(1, -1)
        db_vecs_2d = np.array(database_vectors)

        # Calculate the similarity scores
        similarities = cosine_similarity(new_vec_2d, db_vecs_2d)[0]

        matches = []
        for index, score in enumerate(similarities):
            if score >= self.threshold:
                matches.append({
                    "database_index": index,
                    "similarity_score": float(score)
                })

        # Sort matches from highest score to lowest
        matches.sort(key=lambda x: x["similarity_score"], reverse=True)
        return matches