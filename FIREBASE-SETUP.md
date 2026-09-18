# PEP Senac no Firebase

O pacote está conectado ao projeto `pep-senac`, ao Cloud Firestore e ao Firebase Authentication.

## Primeira ativação

1. No Console do Firebase, abra **Authentication > Sign-in method** e ative **E-mail/Senha**.
2. Publique as regras `firestore.rules` junto com o site. Elas deixam o aluno acessar somente o próprio perfil e reservam a listagem de usuários para docentes e administradores.
3. Crie a conta `marizaproencaa@gmail.com` no Authentication, valide o e-mail e entre no site. O primeiro acesso verificado cria o perfil de Administrador de forma segura.
4. Como administrador, abra **Configurações > Gestão de usuários** para criar docentes e alunos.

## Suporte por e-mail

Os chamados são gravados na coleção `supportTickets`, destinados a `marizaproencaa@gmail.com`, e a página oferece o botão de contato por e-mail. Para envio automático, instale a extensão oficial **Trigger Email** e configure um provedor SMTP. Não inclua senhas SMTP no código ou no Hosting.

## Publicação

No diretório deste arquivo, publique Hosting e regras Firestore pelo Firebase CLI:

```text
firebase deploy --only hosting,firestore
```
