# Quickstart: RPG Editor

This guide provides the basic steps to get the RPG Editor running locally and start creating a game.

## Prerequisites

- Node.js (v20 or later)
- npm
- MongoDB Atlas account

## Installation

1.  **Clone the repository**:
    ```bash
    git clone <repository-url>
    cd rpg-studio
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    ```

3.  **Configure environment variables**:
    Create a `.env.local` file in `apps/editor` and add your MongoDB connection string:
    ```
    MONGODB_URI=<your-mongodb-atlas-connection-string>
    ```

## Running the Editor

1.  **Start the development server**:
    ```bash
    npm run dev
    ```

2.  **Open the editor**:
    Open your web browser and navigate to `http://localhost:3000`.

## Creating Your First Game

1.  From the editor's welcome screen, click **New Project**.
2.  Enter a name for your project and click **Create**.
3.  You will be taken to the project dashboard. From here, you can:
    - Create new maps in the **Map Editor**.
    - Create new characters in the **Character Editor**.
