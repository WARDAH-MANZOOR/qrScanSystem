import prisma from "../prisma/client.js";
 
const task = async () => {
    console.log("Cron running");
    const tasks = await prisma.scheduledTask.findMany({
        where: {
          status: 'pending',
          scheduledAt: {
            lte: new Date(),
          },  
        },
      });
    
      for (const task of tasks) {
        // Your business logic to shift transaction amount
        const transaction = await prisma.transaction.findUnique({
          where: {transaction_id: task.id}
        })
        if (transaction?.original_amount == undefined) {
          return;
        }
        let amount = +transaction?.original_amount * 0.90;

        await prisma.transaction.update({
          data: {
            settled_amount: amount, settlement: true
          },
          where: {transaction_id: task.id}
        })
        // await shiftTransactionAmount(task.transaction_id);
    
        // Update task status
        await prisma.scheduledTask.update({
          where: { id: task.id },
          data: { status: 'completed', executedAt: new Date() },
        });
      }
}

export default task;