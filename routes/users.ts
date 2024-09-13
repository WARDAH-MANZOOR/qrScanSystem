import express from 'express';
var router = express.Router();

/**
 * @swagger
 * /users/:
 *   get:
 *     summary: Retrieve a resource
 *     responses:
 *       200:
 *         description: Successfully retrieves a resource
 *         content:
 *           text/plain:
 *             schema:
 *               type: string
 *               example: respond with a resource
 */
router.get('/', function(req, res, next) {
  res.send('respond with a resource');
});

export default router;
