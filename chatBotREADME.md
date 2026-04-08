# Spark AI: Local In-Browser Financial Chatbot

Spark AI is a privacy, fully local financial assistant built directly into the Freedom Finance dashboard. It requires zero API calls, meaning all user financial data remains completely private and never leaves the browser.
By combining a lightweight local Large Language Model (LLM) with a *"Smart Interceptor"* routing system, Spark provides accurate answers to financial questions while maintaining a conversational tone.

# Sample Use Case

Spark can instantly parse natural language to check specific budgets.

User: "whats my budget for utilities"

Spark: "Budget: Your limit for utilities is $200.00. You have spent $300.00 leaving you with negative $100.00 left."

# Tech Stack & Libraries

- No backend server is required.

- Transformers.js (via Hugging Face): Runs the SmolLM-135M-Instruct ultra-lightweight LLM directly in the browser memory.

- Langchain.js: Manages prompt templates to safely format user queries before passing them to the local LLM.

- RiveScript.js: Handles basic conversational routing instantly without using up the heavy AI model.

- Fuse.js: A lightweight fuzzy search library used to scan the user's local storage for transactions and budgets to match categories and descriptions.

- Currency.js: Ensures all floating point values are formatted accurately, preventing mathematical parsing errors.

# How It Works: The "Smart Interceptor"

Ultra-small LLMs can struggle with complex math or database searches, Spark uses a Smart Interceptor pattern.
When a user asks a question, the JavaScript engine intercepts it while taking away filler words (like "what", "is", "my"). 
It attempts to route it to a specific mathematical function using Fuse.js. If a match is found, the app returns a 100% accurate string data. If no exact data match is found, the query falls back to the local SmolLM model for a conversational response.

Core Routing Capabilities:
Dashboard & Savings Queries: * Instantly calculates total balance, income, expenses, and savings.

# Sample Bot Flow

Example: "What is my total balance?"

Financial Advice & Suggestions: * Scans all expenses, identifies the highest spending category, and calculates a realistic 20% cut to suggest potential savings or investments.

Example: "Where am I spending too much money?" or "How can I cut down?"

Budget Tracking & "Overbudget" Detection: * Checks specific budget limits against logged transactions. It can explicitly warn the user if they have gone over their designated limit.

Example: "Am I overbudget for food?"

Transaction Search: * Uses fuzzy semantic search to find specific logged transactions and returns the date, description, and exact amount.

Example: "Search for the groceries transaction."
