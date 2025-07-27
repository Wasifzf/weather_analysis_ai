import os
import google.generativeai as genai
from typing import Dict, Any, Optional, List
from dotenv import load_dotenv
import json
from pymongo import MongoClient
import numpy as np
from sentence_transformers import SentenceTransformer

from .models import Anomaly, ChatMessage, ChatResponse

load_dotenv()

# --- VECTOR DB CONFIG ---
MONGO_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017/")
VECTOR_DB_NAME = os.getenv("VECTOR_DB_NAME", "cluster0")
VECTOR_COLLECTION = os.getenv("VECTOR_COLLECTION", "embeddings.vec_embed")

# --- EMBEDDING MODEL ---
EMBEDDING_MODEL_NAME = "BAAI/bge-m3"
_embedding_model = None

def get_embedding_model():
    global _embedding_model
    if _embedding_model is None:
        _embedding_model = SentenceTransformer(EMBEDDING_MODEL_NAME)
    return _embedding_model

def get_vector_collection():
    client = MongoClient(MONGO_URI)
    db = client.get_database(VECTOR_DB_NAME)
    return db.get_collection(VECTOR_COLLECTION)

def search_vector_db(query: str, top_k: int = 5, chunking_type: str = "char") -> List[Dict[str, Any]]:
    """
    Search MongoDB vector collection for top-k most similar chunks to the query.
    """
    model = get_embedding_model()
    query_embedding = model.encode([query])[0]
    collection = get_vector_collection()

    # Find all docs with the right chunking_type
    docs = list(collection.find({"chunking_type": chunking_type}))
    if not docs:
        return []
    
    # Compute cosine similarity
    doc_embeddings = np.array([d["embedding"] for d in docs])
    query_vec = np.array(query_embedding)
    similarities = np.dot(doc_embeddings, query_vec) / (
        np.linalg.norm(doc_embeddings, axis=1) * np.linalg.norm(query_vec) + 1e-8)
    top_indices = similarities.argsort()[-top_k:][::-1]
    top_docs = [docs[i] for i in top_indices]
    for i, doc in enumerate(top_docs):
        doc["score"] = float(similarities[top_indices[i]])
    return top_docs

class GeminiAI:
    def __init__(self):
        self.api_key = os.getenv("GEMINI_API_KEY")
        if not self.api_key:
            print("⚠️  GEMINI_API_KEY not found in environment variables")
            self.is_available = False
        else:
            genai.configure(api_key=self.api_key)
            
            # Try different model names in order of preference
            model_names = ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-pro']
            
            for model_name in model_names:
                try:
                    self.model = genai.GenerativeModel(model_name)
                    # Test the model with a simple prompt
                    test_response = self.model.generate_content("Hello")
                    self.is_available = True
                    print(f"✅ Gemini AI initialized successfully with model: {model_name}")
                    break
                except Exception as e:
                    print(f"⚠️  Model {model_name} not available: {e}")
                    continue
            else:
                print("❌ No Gemini models available")
                self.is_available = False
    
    def generate_anomaly_explanation(self, anomaly: Anomaly, 
                                   historical_context: Optional[Dict[str, Any]] = None) -> str:
        """
        Generate a natural language explanation for a weather anomaly
        """
        if not self.is_available:
            return "AI explanation not available (Gemini API key not configured)"
        
        try:
            # Prepare context for the AI
            context = {
                "anomaly_type": anomaly.anomaly_type,
                "severity": anomaly.severity,
                "value": anomaly.value,
                "expected_value": anomaly.expected_value,
                "deviation": anomaly.deviation,
                "z_score": anomaly.z_score,
                "description": anomaly.description,
                "location": anomaly.location,
                "detected_at": anomaly.detected_at.isoformat()
            }
            
            if historical_context:
                context["historical_context"] = historical_context
            
            # Create prompt for Gemini
            prompt = f"""
            You are a climate scientist explaining weather anomalies to the general public.
            
            Here's a weather anomaly that was detected:
            
            **Anomaly Details:**
            - Type: {context['anomaly_type']}
            - Severity: {context['severity']}
            - Actual Value: {context['value']:.2f}
            - Expected Value: {context['expected_value']:.2f}
            - Deviation: {context['deviation']:.2f}
            - Z-Score: {context['z_score']:.2f}
            - Location: {context['location']}
            - Description: {context['description']}
            
            {f"**Historical Context:** {json.dumps(historical_context, indent=2)}" if historical_context else ""}
            
            Please provide a clear, engaging explanation that:
            1. Explains what this anomaly means in simple terms
            2. Compares it to historical patterns
            3. Suggests possible causes (natural variability, climate change, etc.)
            4. Mentions any potential implications
            5. Uses engaging language that would interest the general public
            
            Keep the explanation under 200 words and make it accessible to non-experts.
            """
            
            response = self.model.generate_content(prompt)
            return response.text
            
        except Exception as e:
            print(f"❌ Error generating anomaly explanation: {e}")
            return f"Unable to generate AI explanation: {str(e)}"
    
    def generate_climate_trend_analysis(self, weather_data: List[Dict[str, Any]], 
                                      location: str = "default") -> str:
        """
        Generate climate trend analysis based on historical weather data
        """
        if not self.is_available:
            return "AI analysis not available (Gemini API key not configured)"
        
        try:
            # Prepare summary statistics
            if not weather_data:
                return "No weather data available for analysis"
            
            # Calculate basic statistics
            years = [d['year'] for d in weather_data]
            temps = [d['tas_avg'] for d in weather_data]
            precip = [d['pr_total'] for d in weather_data]
            
            avg_temp = sum(temps) / len(temps)
            avg_precip = sum(precip) / len(precip)
            
            # Calculate trends (simple linear trend)
            if len(years) > 1:
                temp_trend = (temps[-1] - temps[0]) / (years[-1] - years[0])
                precip_trend = (precip[-1] - precip[0]) / (years[-1] - years[0])
            else:
                temp_trend = precip_trend = 0
            
            prompt = f"""
            You are a climate scientist analyzing weather trends. Here's the data for {location}:
            
            **Data Summary:**
            - Time Period: {min(years)} to {max(years)} ({len(years)} years)
            - Average Temperature: {avg_temp:.2f}°C
            - Average Precipitation: {avg_precip:.2f} mm
            - Temperature Trend: {temp_trend:.3f}°C per year
            - Precipitation Trend: {precip_trend:.3f} mm per year
            
            **Recent Data (last 10 years):**
            {json.dumps(weather_data[-10:], indent=2) if len(weather_data) >= 10 else json.dumps(weather_data, indent=2)}
            
            Please provide a climate trend analysis that:
            1. Identifies key patterns in the data
            2. Discusses whether trends are significant
            3. Mentions potential climate change indicators
            4. Compares recent years to historical averages
            5. Suggests what these trends might mean for the future
            
            Keep the analysis under 300 words and make it accessible to the general public.
            """
            
            response = self.model.generate_content(prompt)
            return response.text
            
        except Exception as e:
            print(f"❌ Error generating climate trend analysis: {e}")
            return f"Unable to generate climate analysis: {str(e)}"
    
    def chat_with_weather_data(self, message: ChatMessage) -> ChatResponse:
        """
        Chat interface for users to ask questions about weather data, using RAG if possible
        """
        if not self.is_available:
            return ChatResponse(
                response="AI chat not available (Gemini API key not configured)",
                confidence=0.0
            )
        try:
            # --- Greeting/small talk detection ---
            greetings = ["hello", "hi", "hey", "salaam", "as-salamu alaykum", "good morning", "good evening", "greetings"]
            user_msg = message.message.strip().lower()
            if any(greet in user_msg for greet in greetings) and len(user_msg.split()) <= 3:
                return ChatResponse(
                    response="Hello! I am your climate scientist assistant. Ask me anything about weather anomalies, climate trends, or specific years/events in Pakistan. I can reference scientific context and real data to help you.",
                    confidence=1.0
                )

            # --- RAG: Retrieve context from vector DB ---
            rag_context = search_vector_db(message.message, top_k=5)
            context_texts = [d["metadata"]["text"] for d in rag_context]
            context_info = "\n\n".join(context_texts)
            has_context = bool(context_info)
            if has_context:
                context_info = f"\n\nRelevant scientific context from documents and data:\n{context_info}"

            # --- System prompt ---
            prompt = f"""
            You are a climate scientist and weather anomaly expert for Pakistan. Always answer as a scientist, referencing real data and context if available.

            If the user asks a general greeting (hello, hi, etc.), respond briefly and invite them to ask about anomalies, climate, or specific years/events.

            If context is provided, analyze and reference:
            - The years, locations, and types of anomalies mentioned
            - Any significant climate trends or events
            - How the context relates to the user's question
            - Use scientific language, but keep it clear and accessible
            - If possible, cite years, anomaly types, and statistics from the context

            If no context is available, answer using your general climate science knowledge, but state that you are answering without direct document context.

            {context_info}

            User Question: {message.message}

            Your answer should be:
            - Concise (under 250 words)
            - Referencing context and data if available
            - Written as a climate scientist (not a generic chatbot)
            - If the question is a greeting, do NOT provide a climate analysis, just greet and offer help.
            """
            response = self.model.generate_content(prompt)
            return ChatResponse(
                response=response.text,
                confidence=0.9 if has_context else 0.7,
                sources=["Weather anomaly detection system", "RAG context from vector DB"] if has_context else ["Weather anomaly detection system"]
            )
        except Exception as e:
            print(f"❌ Error in chat interface: {e}")
            return ChatResponse(
                response=f"Sorry, I encountered an error: {str(e)}",
                confidence=0.0
            )
    
    def generate_weather_insights(self, anomalies: List[Anomaly], 
                                weather_summary: Dict[str, Any]) -> str:
        """
        Generate overall insights about weather patterns and anomalies
        """
        if not self.is_available:
            return "AI insights not available (Gemini API key not configured)"
        
        try:
            # Prepare anomaly summary by severity
            anomaly_summary = {}
            for anomaly in anomalies:
                severity = anomaly.severity
                if severity not in anomaly_summary:
                    anomaly_summary[severity] = 0
                anomaly_summary[severity] += 1
            
            # Prepare anomaly summary by type
            anomaly_by_type = {}
            for anomaly in anomalies:
                atype = str(anomaly.anomaly_type)
                if atype not in anomaly_by_type:
                    anomaly_by_type[atype] = 0
                anomaly_by_type[atype] += 1
            
            # Get seasonal distribution of anomalies
            seasonal_anomalies = {}
            for anomaly in anomalies[:10]:  # Use top 10 for seasonal analysis
                # Extract month from description if available
                desc = anomaly.description
                if "anomaly in" in desc and "-" in desc:
                    try:
                        month_part = desc.split("anomaly in ")[1].split(":")[0]
                        if "-" in month_part:
                            month = int(month_part.split("-")[1])
                            season = self.get_season_name(month)
                            if season not in seasonal_anomalies:
                                seasonal_anomalies[season] = 0
                            seasonal_anomalies[season] += 1
                    except:
                        pass
            
            # Convert anomalies to JSON-serializable format with better context
            serializable_anomalies = []
            for anomaly in anomalies[:8]:  # Show more anomalies for better context
                anomaly_dict = {
                    "anomaly_type": str(anomaly.anomaly_type),
                    "severity": str(anomaly.severity),
                    "value": anomaly.value,
                    "expected_value": anomaly.expected_value,
                    "deviation": anomaly.deviation,
                    "z_score": anomaly.z_score,
                    "description": anomaly.description,
                    "location": anomaly.location,
                    "detected_at": anomaly.detected_at.isoformat() if hasattr(anomaly.detected_at, 'isoformat') else str(anomaly.detected_at),
                    "statistical_significance": self.interpret_z_score(anomaly.z_score)
                }
                serializable_anomalies.append(anomaly_dict)
            
            # Calculate data span
            data_years = weather_summary.get('date_range', {})
            start_year = data_years.get('start_year', 'Unknown')
            end_year = data_years.get('end_year', 'Unknown')
            data_span = end_year - start_year + 1 if isinstance(start_year, int) and isinstance(end_year, int) else 'Unknown'
            
            prompt = f"""
            You are a climate scientist analyzing weather anomalies from a comprehensive historical dataset.
            
            **DATASET CONTEXT:**
            - Location: Pakistan region (replace "default" location references with "Pakistan region")
            - Time Period: {start_year} to {end_year} ({data_span} years of data)
            - Total Records: {weather_summary.get('total_records', 'Unknown')} weather observations
            - Data Type: Daily weather measurements aggregated to show significant anomalies
            - Baseline: Each anomaly is compared to month-specific historical averages (not annual averages)
            
            **CLIMATE CONTEXT:**
            - Pakistan has a diverse climate: hot summers (May-Sep), mild winters (Dec-Feb), monsoon season (Jul-Sep)
            - Normal temperature range: 15°C (winter) to 35°C (summer)
            - Normal precipitation: Very low in winter (~5-15mm), high during monsoon (~50-150mm)
            
            **STATISTICAL CONTEXT:**
            - Z-scores ≥2.5: Extreme (occurs ~0.3% of time)
            - Z-scores ≥2.0: High severity (occurs ~5% of time)  
            - Z-scores ≥1.5: Medium severity (occurs ~13% of time)
            
            **OVERALL WEATHER PATTERNS:**
            {json.dumps(weather_summary, indent=2)}
            
            **ANOMALY DISTRIBUTION:**
            - By Severity: {json.dumps(anomaly_summary, indent=2)}
            - By Type: {json.dumps(anomaly_by_type, indent=2)}
            - By Season: {json.dumps(seasonal_anomalies, indent=2)}
            
            **SIGNIFICANT ANOMALIES DETECTED:**
            {json.dumps(serializable_anomalies, indent=2)}
            
            Please provide expert climate insights that:
            1. Interpret these anomalies in the context of Pakistan's climate patterns
            2. Explain what the seasonal distribution of anomalies suggests
            3. Discuss potential climate change indicators
            4. Compare recent anomalies (2020+) to historical patterns
            5. Suggest implications for agriculture, water resources, and extreme weather preparedness
            6. Provide scientifically grounded predictions about future trends
            
            Write in an engaging but authoritative tone suitable for policymakers and the public. Keep under 350 words.
            """
            
            response = self.model.generate_content(prompt)
            return response.text
            
        except Exception as e:
            print(f"❌ Error generating weather insights: {e}")
            return f"Unable to generate weather insights: {str(e)}"
    
    def get_season_name(self, month: int) -> str:
        """Convert month number to season name for Pakistan climate"""
        if month in [12, 1, 2]:
            return "Winter"
        elif month in [3, 4, 5]:
            return "Spring"
        elif month in [6, 7, 8, 9]:
            return "Monsoon"
        else:
            return "Post-Monsoon"
    
    def interpret_z_score(self, z_score: float) -> str:
        """Provide interpretation of z-score statistical significance"""
        abs_z = abs(z_score)
        if abs_z >= 3.0:
            return f"Extremely rare event (occurs ~0.3% of time)"
        elif abs_z >= 2.5:
            return f"Very rare event (occurs ~1% of time)"
        elif abs_z >= 2.0:
            return f"Rare event (occurs ~5% of time)"
        elif abs_z >= 1.5:
            return f"Uncommon event (occurs ~13% of time)"
        else:
            return f"Moderately unusual event"
    
    def is_configured(self) -> bool:
        """Check if Gemini AI is properly configured"""
        return self.is_available

# Global instance
gemini_ai = GeminiAI()
