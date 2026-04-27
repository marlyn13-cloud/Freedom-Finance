# Freedom Finance - Category Partition Test 

It utilizes the Category Partition Method to test the entire Freedom Finance application. By defining parameters and their possible partitions (choices) for each core feature, we covered expected behaviors, UI states, and edge cases.

---

## 1. Feature: Dashboard Overview (`dashboard.html`)

### 1.1 Category Partitions
| Parameter / Category | Partitions (Choices) |
| :--- | :--- |
| **P1: `localStorage` State** | `[Empty/No Data]`, `[Valid Data]`, `[Corrupted Data (e.g., strings in number fields)]` |
| **P2: User Session Action** | `[Initial Page Load]`, `[Hard Browser Refresh]` |

### 1.2 Derived Test Cases
| Test ID | Combinations Tested | Action / Input | Expected Result |
| :--- | :--- | :--- | :--- |
| **TC-01** | P1: Empty, P2: Initial Load | Clear `localStorage` and navigate to the Dashboard. | All cards (Balance, Income, Expenses, Savings) display `$0.00`. The recent transactions list is empty. |
| **TC-02** | P1: Valid, P2: Initial Load | Load Dashboard with `$2000` Income and `$500` Expenses stored locally. | Total Balance exactly calculates and displays `$1500.00`. Top spending categories correctly reflect the highest expenses. |
| **TC-03** | P1: Valid, P2: Refresh | Execute a hard refresh (Ctrl+F5) on the Dashboard. | Page reloads; all numbers and UI elements stay exactly as they were. |
| **TC-04** | P1: Corrupted, P2: Initial | Manually inject `"abc"` into a transaction amount in `localStorage` and load the page. | Application does not crash. System handles the `NaN` error safely (e.g., defaults value to `$0.00`). |

---

## 2. Feature: Transaction Management (`transaction.html`)

### 2.1 Category Partitions
| Parameter / Category | Partitions (Choices) |
| :--- | :--- |
| **P1: Input Amount** | `[Valid Positive Number]`, `[Zero/Negative Number]`, `[Empty]` |
| **P2: Input Category** | `[Existing Default]`, `[New Custom Category]` |
| **P3: List Interaction** | `[Search/Filter by Keyword]`, `[Delete Item]` |

### 2.2 Derived Test Cases
| Test ID | Combinations Tested | Action / Input | Expected Result |
| :--- | :--- | :--- | :--- |
| **TC-01** | P1: Valid, P2: Existing | Input `$50.00`, "Internet", select "Utilities". Click Save. | Transaction saves to `localStorage`, prepends to the UI list, and form clears. |
| **TC-02** | P1: Valid, P2: Custom | Input `$15.00`, "Spotify", create category "Subscriptions". Click Save. | Transaction saves; "Subscriptions" is added to the dropdown permanently. |
| **TC-03** | P1: Zero/Negative, P2: N/A | Input `$-20.00` or `$0.00`, "Lunch", select "Food". Click Save. | System rejects input and prompts user for a valid positive amount. |
| **TC-04** | P1: N/A, P3: Filter | Type `"Internet"` into the transaction search bar. | List dynamically filters to show only the matching transaction. |
| **TC-05** | P1: N/A, P3: Delete | Click the "Delete" icon on the `$50.00` Utilities transaction. | Row is removed from DOM, deleted from `localStorage`, and Dashboard aggregates update. |

---

## 3. Feature: Budget Management (`budget.html`)

### 3.1 Category Partitions
| Parameter / Category | Partitions (Choices) |
| :--- | :--- |
| **P1: Budget Limit Input** | `[Valid Positive Number]`, `[Zero or Negative]` |
| **P2: Spend vs. Budget State**| `[Under Budget (Spend < Limit)]`, `[Over Budget (Spend > Limit)]` |

### 3.2 Derived Test Cases
| Test ID | Combinations Tested | Action / Input | Expected Result |
| :--- | :--- | :--- | :--- |
| **TC-01** | P1: Valid, P2: Under Budget | Set "Groceries" limit to `$400.00`. Total grocery spend is `$100.00`. | Tracker saves and displays `$100.00 / $400.00` with a standard/safe visual status indicator. |
| **TC-02** | P1: Valid, P2: Over Budget | Set "Entertainment" limit to `$100.00`. Logged entertainment spend is `$150.00`. | Tracker saves and visually warns the user (e.g., turns red), indicating they are over budget. |
| **TC-03** | P1: Zero/Negative, P2: N/A | Attempt to set a budget limit of `$0.00` or `-50.00`. | System rejects the save attempt and prompts for a valid threshold greater than zero. |

---

## 4. Feature: Reports & Exports (`reports.html`)

### 4.1 Category Partitions
| Parameter / Category | Partitions (Choices) |
| :--- | :--- |
| **P1: Local Data Availability** | `[Comprehensive Data (Income, Expenses, Budgets)]`, `[Completely Empty Data]` |
| **P2: User Action** | `[View Report Summaries]`, `[Trigger Report Download]` |

### 4.2 Derived Test Cases
| Test ID | Combinations Tested | Action / Input | Expected Result |
| :--- | :--- | :--- | :--- |
| **TC-01** | P1: Comprehensive, P2: View | Navigate to `reports.html` with full user data established. | UI visually renders accurate graphs/summaries matching the Dashboard aggregates. |
| **TC-02** | P1: Comprehensive, P2: Download | Click the "Download Report" button. | Browser natively downloads a file (e.g., CSV/PDF) perfectly reflecting `localStorage` contents without backend calls. |
| **TC-03** | P1: Empty, P2: Download | Clear `localStorage`, navigate to Reports, click "Download". | System either disables the download button or downloads an empty template, cleanly indicating "No data available". |

---

## 5. Feature: Spark.ai Chatbot (`script.js` / LLM Integration)

### 5.1 Category Partitions
| Parameter / Category | Partitions (Choices) |
| :--- | :--- |
| **P1: Query Intent (Routing)** | `[Aggregate Math]`, `[Fuzzy Search]`, `[Complex Analysis]`, `[Gibberish]` |
| **P2: Local Data State** | `[Data Matches Query]`, `[No Data Matches Query]` |

### 5.2 Derived Test Cases
| Test ID | Combinations Tested | Action / Input | Expected Result |
| :--- | :--- | :--- | :--- |
| **TC-01** | P1: Aggregate, P2: Matches | Prompt: *"What is my total balance?"* | Interceptor safely bypasses LLM; instantly returns exact mathematical string (e.g., *"$1,250.00"*). |
| **TC-02** | P1: Fuzzy Search, P2: Matches | Prompt: *"how much did I spend on gas?"* | Fuse.js scans transactions, finds "gas", and returns Exact Date, Description, and Amount. |
| **TC-03** | P1: Fuzzy Search, P2: No Match | Prompt: *"how much did I spend on an airplane?"* | Fuse.js finds no array matches; bot replies it cannot find that transaction. |
| **TC-04** | P1: Complex Analysis, P2: Matches| Prompt: *"Where am I spending too much money?"* | Logic scans arrays, identifies highest category, calculates a 20% reduction, and outputs the suggestion. |
| **TC-05** | P1: Gibberish, P2: N/A | Prompt: *"What is the capital of France?"* | Query routes to local SmolLM; model is constrained via Langchain to safely decline non-financial questions. |
