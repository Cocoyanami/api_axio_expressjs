const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const cors = require('cors');
require('dotenv').config();
const app = express();
const port = 3001;

// Configuración de middleware
app.use(cors());
app.use(bodyParser.json());

// Configuración de la conexión a la base de datos MySQL
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME

});

// Conectar a la base de datos
db.connect(err => {
    if (err) {
        console.error('Error al conectar a la base de datos:', err);
        return;
    }
    console.log('Conexión a MySQL exitosa');
});

// Ruta para guardar respuestas y resultados por sección
app.post('/saveAnswers', (req, res) => {
    const { email, answers, sectionResults } = req.body;

    // Guardar las respuestas
    const insertPromises = answers.map(answer => {
        const query = `
            INSERT INTO quiz_answers (email, question, answer)
            VALUES (?, ?, ?)
            ON DUPLICATE KEY UPDATE answer = ?`;
        return new Promise((resolve, reject) => {
            db.query(query, [email, answer.question, answer.answer, answer.answer], (err, results) => {
                if (err) return reject(err);
                resolve(results);
            });
        });
    });

    // Guardar resultados por sección
    const sectionInsertPromises = Object.keys(sectionResults).map(category => {
        const query = `
            INSERT INTO section_results (email, category, total)
            VALUES (?, ?, ?)
            ON DUPLICATE KEY UPDATE total = ?`;
        return new Promise((resolve, reject) => {
            db.query(query, [email, category, sectionResults[category], sectionResults[category]], (err, results) => {
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

// Ruta para eliminar todos los datos de un usuario
app.delete('/deleteUserData/:email', (req, res) => {
    const email = req.params.email;

    const deleteAnswersQuery = 'DELETE FROM quiz_answers WHERE email = ?';
    const deleteSectionResultsQuery = 'DELETE FROM section_results WHERE email = ?';

    // Eliminar respuestas del usuario
    db.query(deleteAnswersQuery, [email], (err, results) => {
        if (err) return res.status(500).json({ error: 'Error al eliminar respuestas del usuario.' });

        // Eliminar resultados por sección del usuario
        db.query(deleteSectionResultsQuery, [email], (err, results) => {
            if (err) return res.status(500).json({ error: 'Error al eliminar resultados por sección del usuario.' });

            res.json({ message: 'Todos los datos del usuario han sido eliminados.' });
        });
    });
});

// Ruta para eliminar una respuesta específica de un usuario
app.delete('/deleteAnswer', (req, res) => {
    const { email, question } = req.body;

    const query = 'DELETE FROM quiz_answers WHERE email = ? AND question = ?';

    db.query(query, [email, question], (err, results) => {
        if (err) return res.status(500).json({ error: 'Error al eliminar la respuesta.' });

        res.json({ message: 'Respuesta eliminada con éxito.' });
    });
});

// Ruta para eliminar un resultado específico por sección de un usuario
app.delete('/deleteSectionResult', (req, res) => {
    const { email, category } = req.body;

    const query = 'DELETE FROM section_results WHERE email = ? AND category = ?';

    db.query(query, [email, category], (err, results) => {
        if (err) return res.status(500).json({ error: 'Error al eliminar el resultado de sección.' });

        res.json({ message: 'Resultado de sección eliminado con éxito.' });
    });
});

// Ruta para modificar una respuesta específica de un usuario
app.put('/updateAnswer', (req, res) => {
    const { email, question, newAnswer } = req.body;

    const query = 'UPDATE quiz_answers SET answer = ? WHERE email = ? AND question = ?';

    db.query(query, [newAnswer, email, question], (err, results) => {
        if (err) return res.status(500).json({ error: 'Error al actualizar la respuesta.' });

        res.json({ message: 'Respuesta actualizada con éxito.' });
    });
});

// Ruta para modificar un resultado de sección de un usuario
app.put('/updateSectionResult', (req, res) => {
    const { email, category, newTotal } = req.body;

    const query = 'UPDATE section_results SET total = ? WHERE email = ? AND category = ?';

    db.query(query, [newTotal, email, category], (err, results) => {
        if (err) return res.status(500).json({ error: 'Error al actualizar el resultado de sección.' });

        res.json({ message: 'Resultado de sección actualizado con éxito.' });
    });
});

// Iniciar el servidor
app.listen(port, () => {
    console.log(`Servidor escuchando en http://localhost:${port}`);
});
