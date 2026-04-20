# Freedom Finance Dashboard

A web-based personal finance application that enables users to track transactions, manage budgets, and analyze spending behavior. The application is built using HTML, CSS, and JavaScript, with data persistence handled through browser local storage.

---

## Overview

The Freedom Finance Dashboard provides a simple and efficient interface for managing personal finances. Users can record income and expenses, assign categories, set budget limits, and monitor financial performance through real-time updates and visual summaries. This app also introduces an AI FAQ Chatbot called Spark.ai. Spark.ai helps users fetch data faster without the need to search for it. It also provides financial advice for better spending habits.

---

## Features

### Dashboard
- Displays total balance, income, expenses, and savings
- Highlights recent transactions
- Visualizes top spending categories

### Transactions
- Add, edit, and delete transactions
- Assign categories or create custom categories
- Filter and search transactions by keyword

### Budget Management
- Create and manage category-based budgets
- Track spending against budget limits
- Visual indicators for budget status (on track, nearing limit, over budget)

### Reports Tabs
- Download Report summary
- 

## AI CHATBOT: Libraries

- No backend server is required.

- Transformers.js (via Hugging Face): Runs the SmolLM-135M-Instruct ultra-lightweight LLM directly in the browser memory.

- Langchain.js: Manages prompt templates to safely format user queries before passing them to the local LLM.

- RiveScript.js: Handles basic conversational routing instantly without using up the heavy AI model.

- Fuse.js: A lightweight fuzzy search library used to scan the user's local storage for transactions and budgets to match categories and descriptions.

- Currency.js: Ensures all floating point values are formatted accurately, preventing mathematical parsing errors.

## How The AI CHATBOT WORKS
- Spark uses a Smart Interceptor pattern. When a user asks a question, the JavaScript engine intercepts it and removes filler words. It attempts to route it to a specific mathematical function using Fuse.js. If a match is found, the app returns a 100% accurate string data. If no exact data match is found, the query falls back to the local SmolLM model for a conversational response.

- Core Routing Capabilities/Dashboard & Savings Queries:  Instantly calculates total balance, income, expenses, and savings.

## Data Persistence
- Uses browser localStorage to save all data
- No backend or database used

---

## Technologies Used

- HTML
- CSS  
- JavaScript
- LocalStorage API  

---

## Project Structure

```
freedom-finance/
├── index.html      # Application structure and log in
├── dashboard.html   # Dashboard overview Tab file
├── transaction.html # Transaction Tab File
├── budget.html      # Budget Tab File
├── reports.html    # Reports Tab File
├── style.css       # Styling and visual design
├── script.js       # Application logic and state management
└── README.md       # Project documentation
```

---

## Limitations

- Data is stored locally and will not sync across devices  
- No authentication or user accounts  
- No backend integration  

---
## TRY IT FOR FREE

https://marlyn13-cloud.github.io/Freedom-Finance/
-----
## Authors

Michael Tirella  
Juan Nieto  
Marlyn Grullon  

CSIT 415 – Software Engineering II
