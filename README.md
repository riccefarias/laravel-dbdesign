
# Laravel DB Design

**Laravel DB Design** é uma ferramenta de modelagem de dados, similar ao MySQL Workbench, que permite trabalhar diretamente com as migrations do Laravel. Com esta ferramenta, você pode visualizar, editar e gerar migrations de forma intuitiva, utilizando um formato JSON. Ideal para desenvolvedores que buscam uma integração mais direta entre o design do banco de dados e o código do Laravel.

## 📋 Pré-requisitos

- Node.js (versão 14 ou superior)
- NPM (ou Yarn) instalado globalmente

## 🚀 Instalação

### Instalação Global

Você pode instalar a ferramenta globalmente usando o seguinte comando:

```bash
npm install -g https://github.com/riccefarias/laravel-dbdesign
```

Isso permitirá que você use o comando `laravel-dbdesign` em qualquer lugar no seu sistema.

## 🛠️ Uso

### Servindo Migrations e Modelos

1. **Navegue até o diretório do seu projeto Laravel**:

```bash
cd /caminho/para/seu/projeto-laravel
```

2. **Inicie o servidor**:

   Execute o seguinte comando para iniciar o servidor:

   ```bash
   laravel-dbdesign
   ```

   Isso iniciará o servidor na porta padrão `3000` (ou outra porta definida na variável de ambiente `PORT`).

3. **Acesse a Interface Web**:

   Abra o navegador e acesse:

   ```
   http://localhost:3000/laravel-dbdesign
   ```

   Aqui, você poderá interagir com a API para converter migrations do Laravel em JSON e vice-versa.

### Servindo Arquivos Estáticos

O projeto também serve arquivos estáticos a partir da pasta `public`. Basta colocar seus arquivos HTML, CSS, JS, ou imagens na pasta `public` e acessá-los via:

```
http://localhost:3000/nomedoarquivo.extensao
```

## 📚 Funcionalidades

- **Modelagem de Dados Visual**: Visualize e edite a estrutura do banco de dados do seu projeto Laravel diretamente a partir das migrations.
- **Conversão de Migrations em JSON**: Extraia a estrutura das suas tabelas do Laravel para um formato JSON, facilitando a edição e visualização.
- **Geração de Migrations a partir de JSON**: Converta arquivos JSON em migrations do Laravel, automatizando a criação de tabelas e suas respectivas colunas, índices e chaves estrangeiras.
- **Criação Automática de Modelos**: Gera modelos Laravel automaticamente com base nas migrations, economizando tempo na configuração inicial.

## 🛑 Limitações

- Este projeto está em **alpha** e foi desenvolvido inicialmente como uma brincadeira.
- O código ainda passará por revisões para se tornar mais amigável e eficiente.
- Funcionalidades podem mudar ou serem adicionadas ao longo do tempo.

## 📦 Contribuição

Contribuições são bem-vindas! Sinta-se à vontade para abrir uma *issue* ou enviar um *pull request* no repositório.

## 📝 Licença

Este projeto está licenciado sob a licença MIT. Consulte o arquivo [LICENSE](LICENSE) para obter mais detalhes.

---

Desenvolvido com 💻 por [Ricce Farias](https://github.com/riccefarias).
