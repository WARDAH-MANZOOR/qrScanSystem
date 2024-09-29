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
          where: {transaction_id: task.transactionId as string}
        })
        if (transaction?.original_amount == undefined) {
          return;
        }

        await prisma.transaction.update({
          data: {
            settlement: true
          },
          where: {transaction_id: task.transactionId as string}
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