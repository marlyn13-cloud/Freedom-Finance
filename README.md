# Freedom Finance 

### Notes From Class
Created a branch that has everything that I think is importent to include in the database for the app

### Mike and Marlyn's Notes From Class
Mike Notes
Monarch money has a good example of a friendly UI that I like. Some of it could be a little confusing so I feel like we could still make improvements.
Albert app is what I personally use and it has a pretty good interface and pretty user friendly. Between these 5 apps and our requirements gathering I feel we have a good basis on where to start. We can take all the positives and make a clean polished simple to use app. 

From Rocket Money: Make sure our app is not cluttered. Categorize spending cleanly. Implement tools to help cut spending.
From YNAB: Ensure the app is low maintenance with inputs from the user. We want our app to auto categorize money. 
From Credit Karma: Lacks budgeting features but has simple UI.
From Albert: Became cluttered with updates. Used to be a much more simple UI. The app is not always accurate when categorizing income and expenses.
Started timeline and researched security procedures and testing procedures. Will update the timeline.

### -Marlyn Notes week of 2/16
Designed UI for the Budget Tab

-------------------------------------------------------

### MILESTONE 2 PLAN AND READINESS: 

- USER LOGIN (MIKE & MARLYN)
- FORGET PASSWORD/EMAIL/USERNAME (MARLYN)
- DATABASE FOR EACH LOGIN (MIKE & JUAN)
- IMPLEMENTATION OF TRANSACTION TAB (JUAN)
- LINK TO OTHER TABS AND DEBUG (MARLYN)

-------------------------------------------------------

# Freedom Finance Dashboard

A web-based personal finance application that enables users to track transactions, manage budgets, and analyze spending behavior. The application is built using HTML, CSS, and JavaScript, with data persistence handled through browser local storage.

---

## Overview

The Freedom Finance Dashboard provides a simple and efficient interface for managing personal finances. Users can record income and expenses, assign categories, set budget limits, and monitor financial performance through real-time updates and visual summaries.

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

### Data Persistence
- Uses browser localStorage to save all data
- No backend or database at the moment

---

## Technologies Used

- HTML5  
- CSS3  
- JavaScript (Vanilla)  
- LocalStorage API  

---

## Project Structure

```
freedom-finance/
├── index.html      # Application structure and layout
├── style.css       # Styling and visual design
├── script.js       # Application logic and state management
└── README.md       # Project documentation
```

---

## How to Run

1. Download or clone the repository  
2. Navigate to the project folder  
3. Open `index.html` in a web browser  

For development, it is recommended to use Visual Studio Code with the Live Server extension.

---

## Deployment

This project can be deployed using GitHub Pages:

1. Navigate to repository settings  
2. Select "Pages"  
3. Set source to the `main` branch  
4. Access the application at:

```
https://yourusername.github.io/freedom-finance/
```

---

## Limitations

- Data is stored locally and will not sync across devices  
- No authentication or user accounts  
- No backend integration  

---

## Future Enhancements

- Backend integration for persistent storage
- User authentication system and login page
- Export functionality (CSV/PDF reports)  
- AI assistant bot 
- Advanced analytics and reporting features  

---

## Authors

Michael Tirella  
Juan Nieto  
Marlyn Grullon  

CSIT 415 – Software Engineering I
