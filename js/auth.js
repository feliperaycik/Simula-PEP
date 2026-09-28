/* Acesso do PEP pelo Firebase Authentication. */
const loginStyle = document.createElement('link');
loginStyle.rel = 'stylesheet';
loginStyle.href = 'css/login.css?v=16-20260910';
document.head.append(loginStyle);

const themeStyle = document.createElement('link');
themeStyle.rel = 'stylesheet';
themeStyle.href = 'css/theme.css?v=20260926a';
document.head.append(themeStyle);

window.PEPFirebaseReady = window.PEPFirebaseReady || new Promise(resolve => { window.__resolvePEPFirebase = resolve; });
const firebaseService = document.createElement('script');
firebaseService.src = 'js/firebase-service.js?v=20260926a';
firebaseService.defer = true;
document.head.append(firebaseService);

const accessibilityScript = document.createElement('script');
accessibilityScript.src = 'js/accessibility.js?v=20260926a';
accessibilityScript.defer = true;
document.head.append(accessibilityScript);
if (localStorage.getItem('pep_dark') === '1') document.body.classList.add('dark');

const loginForm = document.querySelector('#loginForm');
const errorBox = document.querySelector('#loginError');
const showError = message => { errorBox.textContent = message || ''; };

function enableLocalLogin() {
  loginForm.onsubmit = event => {
    event.preventDefault();
    const email = document.querySelector('#email').value.trim().toLowerCase();
    const password = document.querySelector('#senha').value;
    const users = JSON.parse(localStorage.getItem('pep_usuarios') || '[]');
    const account = users.find(user => user.email.toLowerCase() === email && user.senha === password && user.status === 'Ativo');
    if (account || (email === 'aluno@pep.com' && password === '123456' && !users.some(user=>user.email.toLowerCase()===email))) {
      localStorage.setItem('pep_current_user', account?.nome || email.split('@')[0].replace(/[._-]+/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase()));
      localStorage.setItem('pep_current_email', account?.email || email);
      localStorage.setItem('pep_current_role', account?.perfil || 'Aluno');
      localStorage.setItem('pep_current_unit', account?.unidade || 'Unidade acadêmica');
      localStorage.setItem('pep_current_unit_key', encodeURIComponent(account?.unidade || 'Unidade acadêmica'));
      localStorage.setItem('pep_current_turma', account?.turma || 'Turma acadêmica');
      localStorage.setItem('pep_current_turma_key', encodeURIComponent(account?.turma || 'Turma acadêmica'));
      localStorage.setItem('pep_current_profile_semester', account?.semestre || '');
      localStorage.removeItem('pep_selected_semester');
      localStorage.setItem('pep_logged', 'true');
      location.href = 'dashboard.html';
    } else {
      showError('E-mail ou senha inválidos, ou usuário inativo.');
    }
  };
  document.querySelector('#forgot').onclick = () => alert('A recuperação de senha estará disponível assim que o Firebase Authentication for ativado.');
}

(async () => {
  const firebase = await window.PEPFirebaseReady;
  if (!firebase.enabled) {
    if (window.PEPPreviewLocalOnly === true || localStorage.getItem('pep_preview_local') === '1') enableLocalLogin();
    else showError('Não foi possível iniciar o acesso seguro. Verifique a conexão com o Firebase e tente novamente.');
    return;
  }

  firebase.sessionReady.then(({ user, profile }) => {
    if (user && profile) location.replace('dashboard.html');
  });

  loginForm.onsubmit = async event => {
    event.preventDefault();
    showError('');
    if (!loginForm.reportValidity()) return;
    try {
      await firebase.signIn(document.querySelector('#email').value.trim(), document.querySelector('#senha').value);
      location.replace('dashboard.html');
    } catch (error) {
      showError(error.code === 'auth/invalid-credential' ? 'E-mail ou senha inválidos.' : error.message || 'Não foi possível entrar.');
    }
  };

  document.querySelector('#forgot').onclick = async () => {
    const email = document.querySelector('#email').value.trim();
    if (!email) {
      showError('Informe seu e-mail para receber o link de recuperação.');
      return;
    }
    try {
      await firebase.sendReset(email);
      showError('Enviamos um link para redefinir sua senha.');
    } catch (error) {
      showError(error.message || 'Não foi possível enviar o link.');
    }
  };
})();

document.querySelector('#showPassword').onchange = event => {
  document.querySelector('#senha').type = event.target.checked ? 'text' : 'password';
};

const correctionsStyle=document.createElement('link');correctionsStyle.rel='stylesheet';correctionsStyle.href='css/correcoes-v16.css?v=16-20260910';document.head.append(correctionsStyle);
