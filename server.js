import express from 'express';
import cors from 'cors';

const app = express();
const PORT = 3000;

app.use(cors()); // allow requests from browser
app.use(express.json());

let receivedSquares = [];

app.post('/data', (req, res) => {
    const { x, y,id,color } = req.body;
    receivedSquares.push({ x, y,id,color });
    console.log('Received square:', { x, y,id,color });
    res.json({ status: 'ok' });
});

app.get('/squares', (req, res) => {
    res.json(receivedSquares);
});
app.get('/', (req, res) => {
    res.send('Server is running');
})
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
