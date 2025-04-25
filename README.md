# Task Manager

Welcome to **Task Manager** by spursupdev! 

This project is a part of our Capstone course at the University of South Carolina. The application is designed to manage tasks efficiently within a retail environment. Below is the current status of the application:

## Table of Contents

1. [External Requirements](#external-requirements)
2. [Setup](#setup)
3. [Running](#running)
4. [Deployment](#deployment)
5. [Testing](#testing)
6. [Testing Technology](#testing-technology)
7. [Running Tests](#running-tests)
8. [Authors](#authors)

## External Requirements

Before you begin, ensure you have met the following requirements (Each link will take you to a page to download each item)

1. [Node.js](https://nodejs.org/en): Version 14.0.0 or higher
2. [npm](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm): Version 6.00 or higher
3. [git](https://git-scm.com/downloads): Version 2.20.0 or higher

## Setup

1. **Pull the repository**
    First, pull the latest changes from the remote repository to your local machine:

    ```bash
    git pull
    ```

2. **Install the project dependencies**:

    ```bash
    npm install
    ```
3. **Go to the Seeds folder and seed some data to application**:

    ```bash
    cd seeds
    node indexTest.js
    ```
4. **Launch the Application**:

    ```bash
    node app.js
    ```
5. Login's are provided in the Seeds directory with file called IndexTest.js
   
    NOTE: Use those to Login
## Running

### Access to the App's web page

Open your web browser and go to <http://localhost:3000/> to view the app.

# Deployment

To deploy this web application, ensure you have Node.js and MongoDB installed on your system. First, clone the repository and install dependencies using npm install. Set up a .env file to store sensitive information like database connection strings (do not include passwords in Git). Use a cloud platform like Render. Deploy your database using MongoDB Atlas or another cloud database service. Finally, push your code to a GitHub repository and connect it to your hosting platform for automatic deployment. If needed, configure environment variables in the hosting platform’s dashboard.

# Testing

We have set up automated unit and behavioral tests for our application:

### Unit Testing 

* To run the unit tests, use the following command:

    ```bash
    npm test
    ```

* Unit tests are located in our `/tests/` directory

### Behavioral Testing

To run the behavioral tests, follow these steps:

1. Open another terminal, navigate to the project directory, and run the commands in the [Setup](#setup) portion.

2. Run the Cypress Test Runner in a second terminal:

    ```bash
    npm run cy:open
    ```

3. Once the Cypress window opens, click the **End to End Testing** button. If not previously configured, it should run a configuration command.

4. Choose a desired browser (we recommend either **Electron** or **Chrome**) and click **"Start End to End Testing"**.

5. Choose any of the files titled `*Test.cy.js` to run a specific test. Make sure the application is running in another terminal per Step 1.

* Behavioral tests are located in our `/cypress/e2e/` directory

## Testing Technology

### Jest

* Unit testing was accomplished using [Jest](https://jestjs.io)

  To install Jest, use the following command:

    ```bash
    npm install --save-dev jest
    ```

### Cypress

* Behavioral testing was accomplished using [Cypress](https://www.cypress.io/)

  To install Cypress, use the following command:

    ```bash
    npm install --save-dev cypress
    ```

## Running Tests

### Jest (Unit Testing)

* To run the unit tests, use the following command:

    ```bash
    npm test
    ```

### Cypress (Behavioral Testing)

To run the behavioral tests, follow these steps:

1. Open another terminal, navigate to the project directory, and run the commands in the [Setup](#setup) portion.

2. Run the Cypress Test Runner in a second terminal:

    ```bash
    npm run cy:open
    ```

3. Once the Cypress window opens, click the **End to End Testing** button. If not previously configured, it should run a configuration command.

4. Choose a desired browser (we recommend either **Electron** or **Chrome**) and click **"Start End to End Testing"**.

5. Choose any of the files titled `*Test.cy.js` to run a specific test. Make sure the application is running in another terminal per Step 1.

# Authors

Nolan Blevins <NBLEVINS@email.sc.edu>

Daniel Chavez <DICHAVEZ@email.sc.edu>

Harshil Shah <HASHAH@email.sc.edu>

Pushpendra Shekhawat <SHEKHAWP@email.sc.edu>
