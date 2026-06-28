# AIvitaleye MVP Specification

## 1. Introduction
The AIvitaleye MVP is the foundational release of a clinical-grade iridology platform. It replaces a localized Python/Next.js prototype with a fully web-based, SPA architecture that provides real-time clinical analysis of iris macro-photography using advanced GenAI models.

## 2. Product Requirements
1.  **Multimodal Iris Analysis**: Users must be able to upload a photograph of an eye (or use a simulated procedural image) and receive a detailed, structured clinical report identifying the biological terrain and systemic markers.
2.  **Manual Sign Entry**: Practitioners can manually input observed signs (e.g., constitution, density, structural signs, pigmentations) and have the AI generate a cohesive report.
3.  **Clinical Chat Assistant**: A dedicated chat interface allowing practitioners to ask iridology-specific questions to a specialized AI mentor.
4.  **History & Glossary**: The application must retain a session-based history of reports and provide a built-in clinical glossary for easy reference.

## 3. Non-Functional Requirements
-   **Security**: API keys must be secured on the backend and never exposed to the client.
-   **Performance**: The frontend must load quickly as a Single Page Application (SPA).
-   **Design**: The UI must be professional, clinical, dark-themed, and highly responsive.

## 4. User Stories
-   As an Iridologist, I want to upload an iris photo so that the AI can help me detect constitutional weaknesses.
-   As an Iridologist, I want to manually input my observations so that the AI can format them into a professional report for my patient.
-   As a student of Iridology, I want to chat with an AI mentor to clarify concepts from the German and American schools of Iridology.
