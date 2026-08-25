import { lerCamposOcultos } from '../src/modules/google-drive/google-drive.service';

// A tela de aviso do Drive ("não foi possível verificar se há vírus") traz um
// formulário com campos ocultos. O `uuid` é o que permite pular a tela — sem
// ele, remontar a URL daria na mesma página de novo.
//
// Este é o formato que o Google devolve hoje. Se um dia mudarem o HTML, é este
// teste que quebra primeiro, e o código cai no link comum em vez de falhar.
const HTML_TELA_DE_AVISO = `
<!DOCTYPE html><html><head><title>Google Drive - Aviso de verificação de vírus</title></head>
<body>
  <form id="download-form" action="https://drive.usercontent.google.com/download" method="get">
    <input type="hidden" name="id" value="1AbCdEfGhIjKlMnOpQrStUvWxYz">
    <input type="hidden" name="export" value="download">
    <input type="hidden" name="confirm" value="t">
    <input type="hidden" name="uuid" value="9f8e7d6c-5b4a-3210-fedc-ba9876543210">
    <input type="submit" value="Fazer download mesmo assim">
  </form>
  <p>O arquivo Fernandinho - Dono do Mundo.zip (305M) é muito grande...</p>
</body></html>`;

describe('Tela de aviso do Google Drive', () => {
  it('extrai os campos ocultos do formulário', () => {
    const campos = lerCamposOcultos(HTML_TELA_DE_AVISO);

    expect(campos.uuid).toBe('9f8e7d6c-5b4a-3210-fedc-ba9876543210');
    expect(campos.id).toBe('1AbCdEfGhIjKlMnOpQrStUvWxYz');
    expect(campos.export).toBe('download');
    expect(campos.confirm).toBe('t');
  });

  it('ignora campos que não são hidden', () => {
    const campos = lerCamposOcultos(HTML_TELA_DE_AVISO);
    // O submit tem value mas não tem name — não pode virar parâmetro.
    expect(Object.keys(campos).sort()).toEqual(['confirm', 'export', 'id', 'uuid']);
  });

  it('aceita aspas simples e atributos fora de ordem', () => {
    const campos = lerCamposOcultos(
      `<input name='uuid' type='hidden' value='abc-123'><input value="x" type="hidden" name="confirm">`,
    );
    expect(campos.uuid).toBe('abc-123');
    expect(campos.confirm).toBe('x');
  });

  it('devolve vazio quando não há formulário — o chamador cai no link comum', () => {
    expect(lerCamposOcultos('<html><body>arquivo não encontrado</body></html>')).toEqual({});
    expect(lerCamposOcultos('')).toEqual({});
  });

  it('monta a URL final na ordem que o Google espera', () => {
    const campos = lerCamposOcultos(HTML_TELA_DE_AVISO);
    const params = new URLSearchParams({
      id: campos.id,
      export: campos.export,
      confirm: campos.confirm,
      uuid: campos.uuid,
    });
    const url = `https://drive.usercontent.google.com/download?${params.toString()}`;

    expect(url).toContain('uuid=9f8e7d6c-5b4a-3210-fedc-ba9876543210');
    expect(url).toContain('confirm=t');
    expect(url.startsWith('https://drive.usercontent.google.com/download?')).toBe(true);
  });
});
