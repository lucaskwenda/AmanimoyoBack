import express from 'express';
import mysql from 'mysql2';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

// Configuração do banco de dados
const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'amanimoyo',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Rota para cadastro
app.post('/api/cadastropaciente', (req, res) => {
    console.log('Recebida requisição de cadastro');
    
    const { 
        email, 
        nome,
        senha,
        telefone,
        data_nascimento,
        genero, 
        transtorno,
        biografia,
        objetivos,
    } = req.body;
    
    console.log("Dados recebidos:", req.body);
    
    pool.getConnection((err, connection) => {
        if (err) {
            console.error('Erro ao conectar ao banco:', err);
            return res.status(500).json({ 
                error: 'Erro de conexão com o banco de dados',
                details: err.message 
            });
        }

        connection.beginTransaction((err) => {
            if (err) {
                connection.release();
                return res.status(500).json({ 
                    error: 'Erro ao iniciar transação',
                    details: err.message 
                });
            }
            connection.beginTransaction();

            // Query para inserir usuário
            const userQuery = 'INSERT INTO usuarios (nome, email, phone, senha, tipo, genero, data_nascimento,transtorno, biografia) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)';
            const userValues = [nome, email, telefone, senha, 'paciente', genero, data_nascimento, transtorno, biografia];

            console.log('Executando query de usuário:', userQuery, userValues);

            connection.commit(); // Finaliza a transação corretamente

            connection.query(
                userQuery,
                userValues,
                (err, usuarioResult) => {
                    if (err) {
                        return connection.rollback(() => {
                            connection.release();
                            console.error('Erro na inserção do usuário:', err);
                            if (err.code === 'ER_DUP_ENTRY') {
                                res.status(409).json({ 
                                    error: 'Email já cadastrado',
                                    details: 'Um usuário com este email já existe no sistema' 
                                });
                            } else {
                                res.status(500).json({ 
                                    error: 'Erro ao inserir usuário',
                                    details: err.message 
                                });
                            }
                        });
                    }

                    const usuario_id = usuarioResult.insertId;
                    console.log('ID do usuário criado:', usuario_id);

                    // // Query para inserir paciente
                    // const patientQuery = 'INSERT INTO pacientes (usuario_id, transtorno, biografia, objetivos) VALUES (?, ?, ?, ?)';
                    // const patientValues = [usuario_id, transtorno, sintomas, objetivos];

                    // console.log('Executando query de paciente:', patientQuery, patientValues);

                    // connection.query(
                    //     patientQuery,
                    //     patientValues,
                    //     (err, pacienteResult) => {
                    //         if (err) {
                    //             console.error('Erro na inserção do paciente:', err);
                    //             return connection.rollback(() => {
                    //                 connection.release();
                    //                 res.status(500).json({ 
                    //                     error: 'Erro ao inserir paciente',
                    //                     details: err.message 
                    //                 });
                    //             });
                    //         }

                    //         connection.commit((err) => {
                    //             if (err) {
                    //                 console.error('Erro no commit da transação:', err);
                    //                 return connection.rollback(() => {
                    //                     connection.release();
                    //                     res.status(500).json({ 
                    //                         error: 'Erro ao finalizar transação',
                    //                         details: err.message 
                    //                     });
                    //                 });
                    //             }

                    //             connection.release();
                                res.status(201).json({ 
                                    message: 'Cadastro realizado com sucesso!',
                                    usuario_id: usuario_id
                                });
                    //         });
                    //     }
                    // );
                }
            );
        });
    });
});

// Middleware de validação
function validateRegistrationInput(req, res, next) {
    const { email, nome, senha, telefone, data_nascimento } = req.body;
    
    if (!email || !nome || !senha || !telefone || !data_nascimento) {
        return res.status(400).json({
            error: 'Dados incompletos',
            details: 'Todos os campos obrigatórios devem ser preenchidos'
        });
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({
            error: 'Email inválido',
            details: 'O formato do email não é válido'
        });
    }
    
    next();
}

// Aplicar middleware de validação
app.use('/api/cadastropaciente', validateRegistrationInput);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});

export default app;