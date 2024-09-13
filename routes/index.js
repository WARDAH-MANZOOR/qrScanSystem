import express from 'express';
var router = express.Router();
/**
 * @swagger
 * /:
 *   get:
 *     summary: Renders the home page
 *     responses:
 *       200:
 *         description: Successfully renders the home page
 *         content:
 *           text/html:
 *             schema:
 *               type: string
 */
router.get('/', function (req, res, next) {
    res.render('index', { title: 'Express' });
});
export default router;
