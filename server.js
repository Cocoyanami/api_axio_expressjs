const express = require('express');
const mysql = require('mysql');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const port = 3001;

// Configura el middleware
app.use(cors());
app.use(bodyParser.json());

// Configuración de la conexión a la base de datos
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root', 
    password: '', 
    database: 'quiz_app' // acceso a bd
});

// Conectar a la base de datos
db.connect(err => {
    if (err) {
        console.error('Error conectando a la base de datos:', err);
        return;
    }
    console.log('Conectado a la base de datos MySQL.');
});

// Ruta para guardar respuestas y resultados por sección
app.post('/saveAnswers', (req, res) => {
    const { email, answers, sectionResults } = req.body;

    // Guardar las respuestas
    const insertPromises = answers.map(answer => {
        const query = 'INSERT INTO quiz_answers (email, question, answer) VALUES (?, ?, ?)';
        return new Promise((resolve, reject) => {
            db.query(query, [email, answer.question, answer.answer], (err, results) => {
                if (err) return reject(err);
                resolve(results);
            });
        });
    });

    // Guardar resultados por sección
    const sectionInsertPromises = Object.keys(sectionResults).map(category => {
        const query = 'INSERT INTO section_results (email, category, total) VALUES (?, ?, ?)';
        return new Promise((resolve, reject) => {
            db.query(query, [email, category, sectionResults[category]], (err, results) => {
                if (err) return reject(err);
                resolve(results);
            });
        });
    });

    // Esperar a que se completen ambas inserciones
    Promise.all([...insertPromises, ...sectionInsertPromises])
        .then(() => res.json({ message: 'Respuestas y resultados guardados con éxito.' }))
        .catch(err => res.status(500).json({ error: 'Error al guardar respuestas o resultados.' }));
});

// Obtener todas las respuestas de usuarios y la suma total por sección
app.get('/allUsersWithAnswers', (req, res) => {
    const queryAnswers = 'SELECT email, question, answer FROM quiz_answers';
    const querySections = 'SELECT email, category, SUM(total) as total FROM section_results GROUP BY email, category';

    // Ejecutar la consulta para obtener las respuestas
    db.query(queryAnswers, (err, answersResults) => {
        if (err) return res.status(500).json({ error: 'Error al recuperar las respuestas de usuarios.' });

        // Ejecutar la consulta para obtener las sumas por sección
        db.query(querySections, (err, sectionResults) => {
            if (err) return res.status(500).json({ error: 'Error al recuperar los resultados por sección.' });

            // Agrupar respuestas por usuario
            const userAnswers = answersResults.reduce((acc, row) => {
                const { email, question, answer } = row;

                if (!acc[email]) {
                    acc[email] = { answers: [], sectionTotals: {} };
                }
                acc[email].answers.push({ question, answer });
                return acc;
            }, {});

            // Agrupar resultados por sección
            sectionResults.forEach(row => {
                const { email, category, total } = row;

                if (!userAnswers[email]) {
                    userAnswers[email] = { answers: [], sectionTotals: {} };
                }
                userAnswers[email].sectionTotals[category] = total;
            });

            res.json(userAnswers);
        });
    });
});

// Iniciar el servidor
app.listen(port, () => {
    console.log(`Servidor escuchando en http://localhost:${port}`);
});