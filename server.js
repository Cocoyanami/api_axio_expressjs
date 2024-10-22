const express = require('express');
const mysql = require('mysql');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'quiz_app'
});

// Conectar a la base de datos
db.connect(err => {
    if (err) {
        console.error('Error al conectar a la base de datos:', err);
    } else {
        console.log('Conectado a la base de datos');
    }
});

// Obtener todos los usuarios con sus respuestas y sumas por sección
app.get('/users', (req, res) => {
    const query = `
        SELECT email, question_id, answer 
        FROM user_quiz_data
    `;
    db.query(query, (err, results) => {
        if (err) {
            console.error('Error al obtener datos:', err);
            res.status(500).json({ error: 'Error al obtener datos' });
        } else {
            const users = {};

            results.forEach(row => {
                if (!users[row.email]) {
                    users[row.email] = {
                        answers: [],
                        totalSum: 0
                    };
                }
                users[row.email].answers.push({
                    question_id: row.question_id,
                    answer: row.answer
                });
                users[row.email].totalSum += row.answer;
            });

            res.json(users);
        }
    });
});

// Guardar respuestas de un usuario
app.post('/saveAnswers', (req, res) => {
    const { email, answers } = req.body;
    const query = 'INSERT INTO user_quiz_data (email, question_id, answer) VALUES ?';

    const values = answers.map(answer => [email, answer.question, answer.answer]);

    db.query(query, [values], (err, result) => {
        if (err) {
            console.error('Error al guardar respuestas:', err);
            res.status(500).json({ error: 'Error al guardar respuestas' });
        } else {
            res.json({ message: 'Respuestas guardadas con éxito' });
        }
    });
});

// Eliminar todos los datos de un usuario
app.delete('/deleteUserData/:email', (req, res) => {
    const email = req.params.email;

    const deleteUserQuery = 'DELETE FROM user_quiz_data WHERE email = ?';
    const deleteUserQuestionsQuery = 'DELETE FROM questions WHERE email = ?';

    db.query(deleteUserQuery, [email], (err, result) => {
        if (err) {
            console.error('Error al eliminar respuestas del usuario:', err);
            res.status(500).json({ error: 'Error al eliminar respuestas del usuario' });
            return;
        }

        db.query(deleteUserQuestionsQuery, [email], (err, result) => {
            if (err) {
                console.error('Error al eliminar preguntas del usuario:', err);
                res.status(500).json({ error: 'Error al eliminar preguntas del usuario' });
            } else {
                res.json({ message: 'Datos del usuario eliminados con éxito' });
            }
        });
    });
});

// Eliminar una pregunta y respuesta específica de un usuario
app.delete('/deleteUserQuestion/:email/:questionId', (req, res) => {
    const email = req.params.email;
    const questionId = req.params.questionId;

    const deleteUserQuestionQuery = 'DELETE FROM user_quiz_data WHERE email = ? AND question_id = ?';

    db.query(deleteUserQuestionQuery, [email, questionId], (err, result) => {
        if (err) {
            console.error('Error al eliminar pregunta del usuario:', err);
            res.status(500).json({ error: 'Error al eliminar pregunta del usuario' });
        } else {
            res.json({ message: 'Pregunta y respuesta eliminadas con éxito' });
        }
    });
});

// Actualizar respuestas y preguntas de un usuario
app.put('/updateUserData/:email', (req, res) => {
    const email = req.params.email;
    const { newEmail, newAnswers, newQuestions } = req.body;

    const updateUserDataQuery = 'UPDATE user_quiz_data SET answer = ? WHERE email = ? AND question_id = ?';
    const updateUserQuestionsQuery = 'UPDATE questions SET question = ? WHERE email = ? AND question_id = ?';

    // Actualizar respuestas
    newAnswers.forEach(answerData => {
        db.query(updateUserDataQuery, [answerData.answer, email, answerData.question_id], (err, result) => {
            if (err) {
                console.error('Error al actualizar respuestas del usuario:', err);
                res.status(500).json({ error: 'Error al actualizar respuestas del usuario' });
                return;
            }
        });
    });

    // Actualizar preguntas
    if (newQuestions && newQuestions.length > 0) {
        newQuestions.forEach(questionData => {
            db.query(updateUserQuestionsQuery, [questionData.question, email, questionData.question_id], (err, result) => {
                if (err) {
                    console.error('Error al actualizar preguntas del usuario:', err);
                    res.status(500).json({ error: 'Error al actualizar preguntas del usuario' });
                    return;
                }
            });
        });
    }

    // Actualizar email si se proporciona uno nuevo
    if (newEmail) {
        const updateEmailQuery = 'UPDATE user_quiz_data SET email = ? WHERE email = ?';
        db.query(updateEmailQuery, [newEmail, email], (err, result) => {
            if (err) {
                console.error('Error al actualizar email del usuario:', err);
                res.status(500).json({ error: 'Error al actualizar email del usuario' });
                return;
            }

            const updateQuestionEmailQuery = 'UPDATE questions SET email = ? WHERE email = ?';
            db.query(updateQuestionEmailQuery, [newEmail, email], (err, result) => {
                if (err) {
                    console.error('Error al actualizar email en preguntas:', err);
                    res.status(500).json({ error: 'Error al actualizar email en preguntas' });
                } else {
                    res.json({ message: 'Datos del usuario y preguntas actualizados con éxito' });
                }
            });
        });
    } else {
        res.json({ message: 'Datos del usuario y preguntas actualizados con éxito' });
    }
});

const port = 3000;
app.listen(port, () => {
    console.log(`Servidor ejecutándose en el puerto ${port}`);
});
