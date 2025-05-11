// backend/server.js
import express from 'express';
import mysql from 'mysql2/promise';
import cors from 'cors';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import crypto from 'crypto';
import  bodyParser from 'body-parser';
import multer from 'multer';
// import mime from 'mime-types'
// import FileType from 'file-type';

import { fileTypeFromBuffer } from 'file-type';

import cadastroPaciente from './paciente-cadastro.js';




const app = express();
app.use(cors());
// app.use(cors({
//   origin: 'https://lucaskwenda.github.io'
// }));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
app.use(bodyParser.json());

// Servir arquivos estáticos da pasta 'public' no fronend
app.use(express.static('public'));

app.use('/api/cadastropaciente', cadastroPaciente);
// Configuração do multer para upload de arquivos
// const upload = multer();
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Configuração do MySQL
const connection = await mysql.createConnection({
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

// Rota de login
// Rota de login
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        console.log('Dados recebidos do front-end:', email, password);

        // Busca o usuário no banco de dados
        const query = 'SELECT * FROM usuarios WHERE email = ?';
        const [results] = await connection.execute(query, [email]);

        if (results.length === 0) {
            return res.status(401).json({ error: 'Usuário não encontrado' });
        }

        const usuario = results[0];
        console.log(usuario);

        // Verifica a senha
        // Compare o hash da senha enviado pelo front com o hash armazenado no banco de dados
        const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');
        
        if (usuario.senha !== hashedPassword) {
            return res.status(401).json({ error: 'Senha incorreta' });
        }

        // Gera o token JWT
        const token = jwt.sign(
            { userId: usuario.id, email: usuario.email },
            'sua_chave_secreta',
            { expiresIn: '24h' }
        );

        res.json({
            token,
            usuario: {
                id: usuario.id,
                nome: usuario.nome,
                email: usuario.email
            }
        });

    } catch (error) {
        console.error('Erro durante o login:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});



// Rota para upload da foto de perfil
// Rota para upload
app.post('/upload', upload.single('imagem'), (req, res) => {
    const {id} = req.body
    console.log(id)
    if (!req.file) {
        return res.status(400).send('Nenhum arquivo enviado');
    }

    const sql = 'UPDATE usuarios SET profile_pic = ? WHERE id = ?' ;
    
    connection.query(
        sql,
        [
            req.file.buffer, id
        ],
        (err, result) => {
            if (err) {
                console.error('Erro ao salvar:', err);
                return res.status(500).send('Erro ao salvar imagem');
            }
            res.send('Imagem salva com sucesso!');
        }
    );
});


// Rota para buscar a imagem
// app.get('/imagem/usuario/:userId', (req, res) => {
//     const query = 'SELECT  profile_pic FROM usuarios WHERE id = ?';
    
//     connection.query(query, [req.params.userId], (err, results) => {
//       if (err || !results.length) return res.status(404).send('Imagem não encontrada');

//       console.log('Imagem encontrada:', results[0].imagem);
      
//       res.setHeader('Content-Type', 'image/jpeg');
//       res.send(results[0].imagem);
//     });
//   });



// app.get('/profile-picture/:userId', async (req, res) => {
//     const userId = req.params.userId;

//     try {
//         const [rows] = await connection.query(
//             'SELECT profile_pic FROM usuarios WHERE id = ?',
//             [userId]
//         );
//         console.log('Resultado da consulta:', rows);
//         if (rows.length === 0) {
//             return res.status(404).send('Imagem não encontrada');
//         }

//         const imageBuffer = rows[0].profile_pic;
//         res.contentType('image/png');
//         res.send(imageBuffer);
//     } catch (error) {
//         console.error('Erro detalhado:', error);
//         res.status(500).send(`Erro interno do servidor: ${error.message}`);
//     }
// });


app.get('/profile-picture/:userId', async (req, res) => {
    const userId = req.params.userId;
    
    try {
        const [rows] = await connection.query(
            'SELECT profile_pic FROM usuarios WHERE id = ?',
            [userId]
        );

        if (rows.length === 0) {
            return res.status(404).send('Imagem não encontrada');
        }

        const imageBuffer = rows[0].profile_pic;
        const fileType = await fileTypeFromBuffer(imageBuffer);
        
        if (!fileType) {
            return res.status(400).send('Formato de imagem inválido');
        }

        res.contentType(fileType.mime);
        res.send(imageBuffer);
    } catch (error) {
        console.error('Erro:', error);
        res.status(500).send('Erro interno do servidor');
    }
});




// Rota para buscar informações do usuário

// Rota para buscar usuário
app.get('/api/buscarUsuario/:id', async (req, res) => {
    console.log('ID do usuário solicitado:', req.params.id);
    let conn;

    try {
        // Criar nova conexão usando a configuração correta
        conn =  connection;
        
        // Executar a consulta
        const [results] = await conn.execute(
            'SELECT * FROM usuarios WHERE id = ?',
            [req.params.id]
        );

        if (results.length === 0) {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }

        // Enviar resultado
        res.json(results[0]);

    } catch (error) {
        console.error('Erro detalhado:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    } finally {
        // Fechar a conexão se ela foi aberta
        if (conn) {
            try {
                // await conn.end();
            } catch (error) {
                console.error('Erro ao fechar conexão:', error);
            }
        }
    }
});


// rota para recuperar senha

// Pool de conexões MySQL
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

// Configuração do nodemailer (para envio de emails)
const transporter = nodemailer.createTransport({
   host: 'smtp.gmail.com',
  port: 587, // Porta para TLS
  secure: false, // false para TLS
  service: 'gmail', // ou outro serviço de email
  auth: {
    user: 'Kwenda1000@gmail.com', // seu email
    pass: 'vhox rgkd izsp vkmx' // sua senha ou app password
  }
});

// Armazenamento temporário de códigos de verificação (em produção, use Redis ou similar)
const verificationCodes = new Map();
var userName = null; // chave: userId ou sessionId, valor: objeto

// Rota para verificar se o email existe no banco
app.post('/api/verify-email', async (req, res) => {
  const { email } = req.body;
  console.log('Email recebido para verificação:', email);
  
  if (!email) {
    return res.status(400).json({ success: false, message: 'Email é obrigatório' });
  }

  try {
    const connection = await pool.getConnection();
    
    try {
        // Busca o usuário no banco de dados
       
      // Consulta para verificar se o email existe
      const [rows] = await connection.execute(
        'SELECT id, nome FROM usuarios WHERE email = ?',
        [email]
      );
      userName = rows[0].nome;
      if (rows.length > 0) {
        return res.json({ 
          success: true, 
          exists: true,
          user: {
            id: rows[0].id,
            name: rows[0].nome
          }
        });
       
      } else {
        return res.json({ 
          success: true, 
          exists: false 
        });
      }
    } finally {
       
      connection.release();
    }
  } catch (error) {
    console.error('Erro ao verificar email:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Erro ao processar sua solicitação' 
    });
  }
});

// Rota para enviar código de verificação
app.post('/api/send-verification', async (req, res) => {
  const { email } = req.body;
  
  if (!email) {
    return res.status(400).json({ success: false, message: 'Email é obrigatório' });
  }

  try {
    // Gera um código aleatório de 6 dígitos
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Gera um token único para este processo de recuperação
    const token = crypto.randomBytes(20).toString('hex');
    
    // Armazena o código por 1 hora (em milissegundos)
    verificationCodes.set(email, {
      code: verificationCode,
      token: token,
      expires: Date.now() + 3600000, // 1 hora
      attempts: 0
    });
    
   
    console.log('Nome do usuário:', userName);

    // Envia o email com o código
    const mailOptions = {
      from: 'Amanimoyo@saudemental.com',
      to: email,
      subject: 'AMani Moyo - Recuperação de Senha',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
          <h2 style="color: #4285f4;">Código de Verificação</h2>
          <p>Olá, ${userName}</p>
          <p>Recebemos uma solicitação para redefinir sua senha. Utilize o código abaixo para continuar o processo:</p>
          <div style="background-color: #f5f5f5; padding: 15px; text-align: center; font-size: 24px; letter-spacing: 5px; margin: 20px 0;">
            <strong>${verificationCode}</strong>
          </div>
          <p>Este código expirará em 1 hora. Se você não solicitou esta alteração, ignore este email.</p>
          <p>Atenciosamente,<br>Equipe Amani Moyo</p>
        </div>
      `
    };
    
    await transporter.sendMail(mailOptions);
    
    return res.json({ 
      success: true, 
      message: 'Código enviado com sucesso',
      token: token // Enviamos o token para o cliente
    });
  } catch (error) {
    console.error('Erro ao enviar código:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Erro ao enviar código de verificação' 
    });
  }
});

// Rota para verificar o código
app.post('/api/verify-code', async (req, res) => {
  const { code, email } = req.body;
  
  if (!code || !email) {
    return res.status(400).json({ 
      success: false, 
      message: 'Código e email são obrigatórios' 
    });
  }

  try {
    // Verifica se existe um código para este email
    const verification = verificationCodes.get(email);
    
    if (!verification) {
      return res.json({ 
        success: false, 
        message: 'Nenhuma solicitação de recuperação encontrada para este email' 
      });
    }
    
    // Verifica se o código expirou
    if (Date.now() > verification.expires) {
      verificationCodes.delete(email);
      return res.json({ 
        success: false, 
        message: 'O código expirou. Solicite um novo código' 
      });
    }
    
    // Incrementa o número de tentativas
    verification.attempts++;
    
    // Verifica se excedeu o limite de tentativas (3)
    if (verification.attempts > 3) {
      verificationCodes.delete(email);
      return res.json({ 
        success: false, 
        message: 'Número máximo de tentativas excedido. Solicite um novo código' 
      });
    }
    
    // Verifica se o código está correto
    if (verification.code !== code) {
      return res.json({ 
        success: false, 
        message: `Código incorreto. Você tem ${3 - verification.attempts} tentativa(s) restante(s)` 
      });
    }
    
    // Código verificado com sucesso
    // Gera um token para redefinição de senha
    const resetToken = crypto.randomBytes(20).toString('hex');
    const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 horas
    
    // Salva o token no banco de dados
    const connection = await pool.getConnection();
    
    try {
      await connection.execute(
        'UPDATE usuarios SET reset_token = ?, reset_token_expiry = ? WHERE email = ?',
        [resetToken, tokenExpiry, email]
      );
      
      // Envia email com o link para redefinir a senha
      const resetLink = `https://amanimoyo.com/redefinir-senha?token=${resetToken}&email=${encodeURIComponent(email)}`;
      
      const mailOptions = {
        from: 'amanimoyo@saudemental.com',
        to: email,
        subject: 'Amani Moyo - Redefinição de Senha',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
            <h2 style="color: #4285f4;">Redefinição de Senha</h2>
            <p>Olá, ${userName}</p>
            <p>Seu código foi verificado com sucesso. Clique no botão abaixo para criar uma nova senha:</p>
            <div style="text-align: center; margin: 25px 0;">
              <a href="${resetLink}" style="background-color: #4285f4; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">Redefinir minha senha</a>
            </div>
            <p>Este link expirará em 24 horas.</p>
            <p>Se você não conseguir clicar no botão, copie e cole o link abaixo em seu navegador:</p>
            <p style="word-break: break-all; background-color: #f5f5f5; padding: 10px; font-size: 12px;">${resetLink}</p>
            <p>Atenciosamente,<br>Equipe Amani Moyo</p>
          </div>
        `
      };
      
      await transporter.sendMail(mailOptions);
      
      // Remove o código de verificação da memória
      verificationCodes.delete(email);
      
      return res.json({ 
        success: true, 
        message: 'Código verificado com sucesso. Verifique seu email para redefinir sua senha.'
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Erro ao verificar código:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Erro ao processar sua solicitação' 
    });
  }
});


// enviar codigo de verificação
// Endpoint para enviar o código de verificação
app.post('/api/send-verification-code', async (req, res) => {
  try {
    const { email, name } = req.body;
    console.log("e o teu " + email + "o seu no me é" + name)
    
    if (!email) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email é obrigatório' 
      });
    }

    // Gerar código de verificação (6 dígitos)
    const verificationCode = Math.floor(10000 + Math.random() * 90000).
    toString();
    
    // Configurar o email
    const mailOptions = {
      from: 'amanimoyo@gmail.com', // seu email
      to: email,
      subject: 'Amani Mmoyo - Código de Verificação',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
          <h2 style="color: #4285f4;">Código de Verificação</h2>
          <p>Olá${name ? ', ' + name : ''}!</p>
          <p>Aqui está seu código de verificação para Amani Moyo:</p>
          <div style="background-color: #f5f5f5; padding: 15px; text-align: center; font-size: 24px; letter-spacing: 5px; margin: 20px 0;">
            <strong>${verificationCode}</strong>
          </div>
          <p>Este código expirará em 10 minutos.</p>
          <p>Se você não solicitou este código, por favor ignore este email.</p>
          <p>Atenciosamente,<br>Equipe Amani Moyo</p>
        </div>
      `
    };
    
    // Enviar o email
    await transporter.sendMail(mailOptions);
    
    // Responder ao cliente com sucesso e o código para verificação
    return res.json({ 
      success: true, 
      message: 'Código enviado com sucesso',
      verificationCode: verificationCode // Enviamos o código para o cliente verificar
    });
    
  } catch (error) {
    console.error('Erro ao enviar código:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Erro ao enviar código de verificação' 
    });
  }
});



// Rota para criar uma nova consulta
app.post('/api/consultas', async (req, res) => {
  try {
    const { nomeUser, emailUser, data, horario, transtorno, sintomas, usuario_Id } = req.body;
    
    // Validar campos obrigatórios
    if (!nomeUser || !emailUser ) {
      console.log('Dados recebidos do front-end:', req.body);
      return res.status(400).json({ 
        sucesso: false, 
        mensagem: 'Todos os campos obrigatórios devem ser preenchidos' 
      });
    }
    
    // Obter conexão do pool
    const connection = await pool.getConnection();
    
    try {
      // Inserir dados na tabela de consultas
      const [result] = await connection.execute(
        'INSERT INTO consultas (paciente_id, data_consulta, tipo_transtorno, descricao_sintomas, horario) VALUES (?, ?, ?, ?, ?)',
        [usuario_Id, data, transtorno, sintomas, horario || '']
      );
      
      connection.release();
      
      console.log('Consulta agendada:', { id: result.insertId, ...req.body });
      
      res.status(201).json({ 
        sucesso: true, 
        mensagem: 'Consulta agendada com sucesso',
        id: result.insertId
      });
    } catch (error) {
      connection.release();
      throw error;
    }
  } catch (error) {
    console.error('Erro ao agendar consulta:', error);
    res.status(500).json({ 
      sucesso: false, 
      mensagem: 'Erro ao processar o agendamento da consulta'
    });
  }
});

app.listen(3000, () => {
    console.log('Servidor rodando na porta 3000');
});