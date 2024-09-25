# Sahulat Pay
This is the repo for the our ongoing project backend. The steps to setup the backend system in the PC is:
1. Install PostgreSQL on the system
2. Clone the given repo
3. Run npm install in the cloned folder
4. Create .env file and add **DATABASE_URL="postgresql://username:password@localhost:5432/your_database"** in it to connect to local postgres instance.
5. Run **npm run migrate**, **npm run seed** in the terminal
6. Open a terminal and run **npm run dev** in it.
7. Access swagger docs at **localhost:3001/api-docs** while redoc docs at **localhost:3001/redoc** for getting started with apis and integrating them 
