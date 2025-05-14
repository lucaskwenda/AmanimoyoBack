import express from 'express';
import mysql from 'mysql2';
import cors from 'cors';


const router = express.Router();

const app = express();
app.use(cors());
app.use(express.json());

//Configuração do banco de dados
const pool = mysql.createPool({
    host: 'mysql-104b5784-amanimoyo.l.aivencloud.com',
    user: 'avnadmin',
    password: 'AVNS_7mS2Mw5mucKOdLbtk2L',
    database: 'amanimoyo',
     port: 21180,                         // fornecido pelo Aiven (pode ser diferente!)
    ssl: {
       rejectUnauthorized: false,
    },
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// const pool = mysql.createPool({
//     host: 'localhost',
//     user: 'root',
//     password: '',
//     database: 'amanimoyo',
//     waitForConnections: true,
//     connectionLimit: 10,
//     queueLimit: 0
// });
// rota para update user info
app.put('/api/users/update', (req, res) => {
  const { name, email, bio, phone, password, id } = req.body;

  console.log("Dados recebidos:", req.body);

  const query = `UPDATE usuarios SET nome = ?, email = ?, biografia = ?, phone = ?, senha = ? WHERE id = ?`;
  const values = [name, email, bio, phone, password, id];

  pool.query(query, values, (error, result) => {
    if (error) {
      console.error('Erro ao atualizar usuário:', error);
      return res.status(500).json({ message: 'Erro interno do servidor.' });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Usuário não encontrado.' });
    }

    res.json({ message: 'Usuário atualizado com sucesso.' });
  });
});
// Rota para cadastro
router.post('/', (req, res) => {
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
export default router;
// export default app;