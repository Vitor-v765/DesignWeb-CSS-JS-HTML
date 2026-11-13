// ===== Configuração =====
const API_URL = "https://apisimpsons.fly.dev/api/personajes?limit=1000";
const POR_PAGINA = 40;
const CHAVE_FAVORITOS = "simpsons:favoritos";

// A API não tem campo de popularidade, então os 40 personagens mais
// populares foram escolhidos manualmente (IDs exatos da API, em ordem).
const POPULARES = [
  "63e2b3b9e6c69920933ff306", // Homero Simpson
  "63e2beaee6c69920933ff310", // Marge Simpson
  "6406722422be87b1d027bd0b", // Bart Simpson
  "63ec18975d30fabfe450286a", // Lisa Simpson
  "63e2be37e6c69920933ff30e", // Maggie Simpson
  "63e2c200e6c69920933ff31b", // Abraham Simpson (Vovô)
  "63e32a4cedf49032166caf56", // Ned Flanders
  "63e335d9edf49032166d73df", // Moe Szyslak
  "63e3d2a2958741730f865753", // Apu
  "63e3363aedf49032166d7a42", // Barney Gumble
  "63e3373eedf49032166d8b6c", // Lenny Leonard
  "63e336d5edf49032166d847a", // Carl Carlson
  "63e32907edf49032166c9a0f", // Seymour Skinner
  "63e3b69adc7c8413ba3c5395", // Chefe Wiggum
  "63e3b62adc7c8413ba3c4cf6", // Ralph Wiggum
  "63ec17f95d30fabfe4502829", // Nelson Muntz
  "63e2c04de6c69920933ff317", // Milhouse
  "63e32e1fedf49032166cf07b", // Krusty, o Palhaço
  "63e3bd43958741730f8535f2", // Sideshow Bob
  "63e327a7edf49032166c82f6", // Sr. Burns
  "63e32851edf49032166c8e19", // Smithers
  "63e3330eedf49032166d44aa", // Patty Bouvier
  "63e3336eedf49032166d4b12", // Selma Bouvier
  "63e3bcae958741730f852dc1", // Prefeito Quimby
  "63e33271edf49032166d3a36", // Willie, o Jardineiro
  "63e3354bedf49032166d6a77", // Edna Krabappel
  "63e3c174958741730f8572a8", // Dr. Hibbert
  "63e46d067de1feab294260ea", // Comic Book Guy
  "63e3bf75958741730f855609", // Professor Frink
  "63e33957edf49032166dae47", // Kent Brockman
  "63e3ca5e958741730f85ec2f", // Otto
  "63e3bbaf958741730f851edb", // Fat Tony
  "63e32fd7edf49032166d0e37", // Martin Prince
  "63e479d77de1feab29426b94", // Ajudante do Papai Noel
  "63ec5a4f8b142917b4a274ee", // Bola de Neve
  "63e3298eedf49032166ca2b3", // Superintendente Chalmers
  "63e32ae6edf49032166cb9a1", // Reverendo Lovejoy
  "63e32b5aedf49032166cc164", // Helen Lovejoy
  "63e3c01c958741730f855fb8", // Rod Flanders
  "63e3c0da958741730f856a3c", // Todd Flanders
];
const IMAGEM_PADRAO =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">
      <rect width="200" height="200" fill="#fed41d"/>
      <text x="100" y="125" font-size="90" text-anchor="middle">?</text>
    </svg>`
  );

// ===== Elementos do DOM =====
const elCards = document.getElementById("cards");
const elBusca = document.getElementById("busca");
const elStatus = document.getElementById("filtro-status");
const elBtnFav = document.getElementById("btn-favoritos");
const elBtnMais = document.getElementById("btn-mais");
const elContador = document.getElementById("contador");
const elMensagem = document.getElementById("mensagem");

// ===== Estado =====
let personagens = [];
let filtrados = [];
let exibidos = 0;
let somenteFavoritos = false;
let favoritos = new Set(carregarFavoritos());

// ===== Favoritos (localStorage) =====
function carregarFavoritos() {
  try {
    return JSON.parse(localStorage.getItem(CHAVE_FAVORITOS)) || [];
  } catch {
    return [];
  }
}

function salvarFavoritos() {
  try {
    localStorage.setItem(CHAVE_FAVORITOS, JSON.stringify([...favoritos]));
  } catch {
    /* armazenamento indisponível: segue sem persistir */
  }
}

// ===== Utilitários =====
const limpar = (texto) => (texto || "").trim();

// Remove acentos e põe em minúsculas, para a busca ignorar "Homero" x "homéro"
const normalizar = (texto) =>
  limpar(texto).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

function classeDoStatus(status) {
  const s = normalizar(status);
  if (s === "vivo") return "badge--vivo";
  if (s === "fallecido") return "badge--fallecido";
  if (s === "ficticio") return "badge--ficticio";
  return "badge--outro";
}

// ===== Consumo da API =====
async function buscarPersonagens() {
  mostrarMensagem("Carregando personagens de Springfield...");
  try {
    const resposta = await fetch(API_URL);
    if (!resposta.ok) throw new Error(`Erro HTTP ${resposta.status}`);
    const dados = await resposta.json();

    // A API devolve { docs: [...] }
    const todos = (dados.docs || []).map((p) => ({
      id: p._id,
      nome: limpar(p.Nombre) || "Sem nome",
      imagem: limpar(p.Imagen),
      historia: limpar(p.Historia),
      genero: limpar(p.Genero),
      status: limpar(p.Estado),
      ocupacao: limpar(p.Ocupacion),
    }));

    // Mantém só os 40 mais populares, na ordem da lista POPULARES
    personagens = POPULARES
      .map((id) => todos.find((p) => p.id === id))
      .filter(Boolean);

    popularFiltroDeStatus();
    mostrarMensagem("");
    aplicarFiltros();
  } catch (erro) {
    console.error(erro);
    mostrarMensagem(
      "Ops! Não foi possível carregar os personagens. Verifique sua conexão e tente novamente.",
      true
    );
  }
}

// ===== Criação dos cards (100% via JavaScript) =====
function criarCard(p) {
  const card = document.createElement("article");
  card.className = "card";

  // Nome
  const nome = document.createElement("h2");
  nome.className = "card__nome";
  nome.textContent = p.nome;

  // Botão de favoritar (coração)
  const fav = document.createElement("button");
  fav.type = "button";
  fav.className = "card__fav";
  fav.setAttribute("aria-label", `Favoritar ${p.nome}`);
  fav.setAttribute("aria-pressed", favoritos.has(p.id));
  fav.innerHTML = `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 2.6 5 6 5c2 0 3.4 1.1 4.3 2.4h3.4C14.6 6.1 16 5 18 5c3.4 0 5.1 3.4 3.6 6.8C19.5 16.4 12 21 12 21z"
            stroke-linejoin="round"/>
    </svg>`;
  fav.addEventListener("click", () => alternarFavorito(p.id, fav));

  // Imagem
  const caixaImg = document.createElement("div");
  caixaImg.className = "card__imagem";
  const img = document.createElement("img");
  img.src = p.imagem || IMAGEM_PADRAO;
  img.alt = `Imagem de ${p.nome}`;
  img.loading = "lazy";
  img.addEventListener("error", () => {
    img.src = IMAGEM_PADRAO; // fallback se a imagem quebrar
  }, { once: true });
  caixaImg.appendChild(img);

  // Informações
  const info = document.createElement("div");
  info.className = "card__info";

  const badges = document.createElement("div");
  badges.className = "badges";
  if (p.status) badges.appendChild(criarBadge(p.status, classeDoStatus(p.status)));
  if (p.genero) badges.appendChild(criarBadge(p.genero, ""));
  info.appendChild(badges);

  if (p.ocupacao) {
    const ocup = document.createElement("p");
    ocup.className = "card__ocupacao";
    ocup.textContent = `💼 ${p.ocupacao}`;
    info.appendChild(ocup);
  }

  if (p.historia) {
    const hist = document.createElement("p");
    hist.className = "card__historia";
    hist.textContent = p.historia;
    hist.title = p.historia;
    info.appendChild(hist);
  }

  card.append(nome, fav, caixaImg, info);
  return card;
}

function criarBadge(texto, classeExtra) {
  const b = document.createElement("span");
  b.className = `badge ${classeExtra}`.trim();
  b.textContent = texto;
  return b;
}

// ===== Renderização com paginação =====
function renderizarMais() {
  const fim = Math.min(exibidos + POR_PAGINA, filtrados.length);
  const fragmento = document.createDocumentFragment();
  for (let i = exibidos; i < fim; i++) fragmento.appendChild(criarCard(filtrados[i]));
  elCards.appendChild(fragmento);
  exibidos = fim;
  atualizarRodape();
}

function atualizarRodape() {
  elBtnMais.hidden = exibidos >= filtrados.length;
  elContador.textContent = filtrados.length
    ? `Mostrando ${exibidos} de ${filtrados.length} personagens`
    : "";
}

// ===== Filtros =====
function aplicarFiltros() {
  const termo = normalizar(elBusca.value);
  const status = elStatus.value;

  filtrados = personagens.filter((p) => {
    if (termo && !normalizar(p.nome).includes(termo)) return false;
    if (status && p.status !== status) return false;
    if (somenteFavoritos && !favoritos.has(p.id)) return false;
    return true;
  });

  elCards.innerHTML = "";
  exibidos = 0;

  if (filtrados.length === 0) {
    mostrarMensagem(
      somenteFavoritos && favoritos.size === 0
        ? "Você ainda não favoritou ninguém. Clique no ♥ de um card!"
        : "Nenhum personagem encontrado. D'oh!"
    );
    elBtnMais.hidden = true;
    elContador.textContent = "";
    return;
  }

  mostrarMensagem("");
  renderizarMais();
}

function popularFiltroDeStatus() {
  const lista = [...new Set(personagens.map((p) => p.status).filter(Boolean))].sort();
  for (const s of lista) {
    const op = document.createElement("option");
    op.value = s;
    op.textContent = s;
    elStatus.appendChild(op);
  }
}

function alternarFavorito(id, botao) {
  if (favoritos.has(id)) favoritos.delete(id);
  else favoritos.add(id);
  salvarFavoritos();
  botao.setAttribute("aria-pressed", favoritos.has(id));
  if (somenteFavoritos) aplicarFiltros(); // remove o card da lista de favoritos
}

function mostrarMensagem(texto, erro = false) {
  elMensagem.textContent = texto;
  elMensagem.classList.toggle("mensagem--erro", erro);
}

// ===== Eventos =====
let temporizador;
elBusca.addEventListener("input", () => {
  clearTimeout(temporizador);
  temporizador = setTimeout(aplicarFiltros, 200); // debounce
});
elStatus.addEventListener("change", aplicarFiltros);
elBtnMais.addEventListener("click", renderizarMais);
elBtnFav.addEventListener("click", () => {
  somenteFavoritos = !somenteFavoritos;
  elBtnFav.setAttribute("aria-pressed", somenteFavoritos);
  aplicarFiltros();
});

// ===== Início =====
buscarPersonagens();
