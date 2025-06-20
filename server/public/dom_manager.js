let markersMap = {}; //Dizionario dei markers sulla mappa
let sites = []; //I siti caricati dall'ultima chiamata all'API
//Elenco delle province della RER
let province = ["CITTA' METROPOLITANA DI BOLOGNA", "MODENA", "REGGIO EMILIA", "FERRARA", "RIMINI", "PIACENZA", "RAVENNA", "PARMA", "FORLI'"];

//Inizializzazione mappa
const map = L.map('map').setView([44.5, 11.3], 8);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

//Creazione marker per ogni sito:sites
function markSites(sites){
    //Pulizia markers
    Object.keys(markersMap).forEach(key => {
      map.removeLayer(markersMap[key]);
      delete markersMap[key];
    });

    //Aggiunta nuovi markers
    sites.forEach(sito => {
        if (sito.lat && sito.lon) {
            const marker = L.marker([parseFloat(sito.lat), parseFloat(sito.lon)])
                            .addTo(map)
                            .bindPopup(`
                              <b style='color:#F23041; font-size:medium;'>Codice: ${sito.codice}</b><br>
                              <b>Attività:</b> ${sito.attività}<br>
                              <b>Indirizzo:</b> ${sito.indirizzo}<br>
                              <b>${sito.comune + ', ' + sito.provincia}<br></b>
                              <button type="button" class="marker-button show-more-btn" data-id="${sito.codice}">Mostra altro</button>
                            `);  
                            
            markersMap[sito.codice] = marker;
                            
            //Chiusura pannello informazioni
            marker.on('popupclose', function () {
              showLess();
            });
        }
    });
}

//Aggiorna le info
async function updateDefaultCard(){
  const sitesSizes = [sites.length, 0, 0];

  sites.forEach(s => {
    sitesSizes[1] += Object.keys(s).filter(k => k.startsWith('bonifica') && s[k] === 'Si').length;
    sitesSizes[2] += Object.keys(s).filter(k => k.startsWith('messa') && s[k] === 'Si').length;
  });

  document.getElementById("default")
          .querySelector('.card')
          .querySelectorAll('dd')
          .forEach((d, i) => {
            d.innerHTML = sitesSizes[i];
  });
}

//Riempie i select con i valori dentro values
function populateSelect(selects, values, includeEmpty=false) {
  const selectList = Array.isArray(selects) || selects instanceof NodeList
    ? Array.from(selects)
    : [selects];

  selectList.forEach(el => {
    const fragment = document.createDocumentFragment();

    if(includeEmpty){
      //Aggiunta opzione vuota
      const firstOption = document.createElement("option");
      firstOption.value = "";
      firstOption.textContent = "-- Seleziona --";
      fragment.appendChild(firstOption);
    }
    
    //Aggiunta opzioni
    values.forEach(val => {
      const option = document.createElement("option");
      option.value = val;
      option.textContent = val;
      fragment.appendChild(option);
    });

    el.appendChild(fragment);
  });
}

//Mostra popup conferma operazione
function showPopup(sezione, success) {
  const popup = document.getElementById(sezione).querySelector('.popup-confirm');

  if(success === true){
    popup.style['background-color'] = '#03A65A';
    popup.innerHTML = 'Operazione completata con successo!';
  }else{
    popup.style['background-color'] = '#F23041';
    popup.innerHTML = 'Errore! Non è stato possibile completare l\'operazione';
  }

  popup.style.opacity = '1';
  popup.style.transform = 'translateY(0)';
  popup.style.pointerEvents = 'auto';

  setTimeout(() => {
    popup.style.opacity = '0';
    popup.style.transform = 'translateY(-10px)';
    popup.style.pointerEvents = 'none';
  }, 2000);

  mostraSezione(sezione);
}

//Cambia sezione attiva
async function mostraSezione(id) {
    const sezioni = document.querySelectorAll('section');
    sezioni.forEach(s => {s.classList.remove('attiva')});

    const sezione = document.getElementById(id);
    sezione.classList.add('attiva');

    const header = document.querySelector('header');
    const stile = window.getComputedStyle(header);
    const headerOffset = header.getBoundingClientRect().height + parseFloat(stile.marginBottom);
    const elementPosition = sezione.getBoundingClientRect().top;
    const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

    window.scrollTo({
      top: offsetPosition,
      behavior: "smooth"
    });

    if((id !== 'infopanel' && id !== "modificaSito") && Object.keys(queryFields).length !== 0){
      console.log(queryFields);
      sites = await getSites();
      markSites(sites);
    }
}

//Mostra informazioni aggiuntive sito
function showMore(sito){
    sitoSelezionato = sito;
    const targetKeys = Object.keys(sito).slice(5, 12);
    let ddArray = document.getElementById('infopanel').querySelector(`.card`).querySelectorAll('dd');

    targetKeys.forEach((t, i) => {
        ddArray[i].innerHTML = sito[t];
    });

    mostraSezione("infopanel");
}

//Nasconde informazioni aggiuntive sito
function showLess(){

    document.getElementById('infopanel').querySelector('.card').querySelectorAll('dd').forEach(d => {
        d.innerHTML = '';
    })

    document.getElementById("modificaSito").querySelector('form').reset();
    mostraSezione("default");
    document.querySelector('.modify-btn').removeAttribute('data-id');
    document.querySelector('.delete-btn').removeAttribute('data-id');
}

// Funzione per mostrare il form di modifica 
function showEditForm(sito) {
  const form = document.getElementById("modificaSito").querySelector("form");

  const keys = Object.keys(sito)
                    .filter(k => k.startsWith('bonifica') || k.startsWith('messa_sicurezza'));

  // Reset dei checkbox
  form.querySelectorAll("input[type=checkbox]").forEach(i => i.checked = false);

  keys.forEach(k => {
    if (sito[k] === 'Si') {
      form.querySelectorAll(`input[name=${k}]`).forEach(i => i.checked = true);
    }
  });

  form.querySelector('input[name=procedura').value = sito.procedura;
  form.querySelector('input[name=note]').value = sito.note;

  mostraSezione("modificaSito");
}


/* Setup iniziale pagina */
window.addEventListener("load", async () => {
  sites = await getSites();
  markSites(sites);
  updateDefaultCard();
  let filterOptions = ["Si", "No"];

  populateSelect(document.querySelectorAll("select"), [], true); //Aggiunge opzione vuota a tutti i select
  populateSelect(document.querySelectorAll(".provincia"), province); //Aggiunge un'opzione per ogni provincia ai select .provincia
  populateSelect(document.querySelector("#hidden-items").querySelectorAll("select"), filterOptions);
});

//Cerca per codice
document.getElementById("cerca").querySelector("form").addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const objData = Object.fromEntries(formData.entries());
    
    try{
      sites = await getSites('codice', objData.codice);
    }catch(e){
      console.log(e);
    }
   
    markSites(sites);
    e.target.querySelector('input[name="codice"]').value = '';
});

//Filtraggio siti
document.getElementById("filters").querySelectorAll("select").forEach(el => {
    el.addEventListener('change', async (e) => {
        sites = await getSites(e.target.id, e.target.value);
        markSites(sites);

      //Modifica le opzioni del filtro comune in base al valore di provincia
      if(e.target.id === "provincia"){
        const selectComune = document.getElementById('comune');
        const comuniPresenti = new Set();

        while(selectComune.children.length > 1) {
          selectComune.removeChild(selectComune.lastChild);
        }

        if(e.target.value !== ''){
          sites.forEach(sito  => {
              if(sito.provincia === e.target.value && !comuniPresenti.has(sito.comune)){
                comuniPresenti.add(sito.comune.toUpperCase());
              }
          });

          populateSelect(selectComune, comuniPresenti);

          document.querySelector('.comune-group').style.display = 'flex';
        }
        else{
          document.querySelector('.comune-group').style.display = "none";
        }
      }
    })  
});

document.getElementById('filters-buttons').querySelectorAll('button').forEach(b => {
  b.addEventListener('click', async (e) => {
    if(e.target.id === 'more-filters'){//Toggle filtri avanzati
      const moreFilters = document.getElementById("hidden-items");

      if(e.target.textContent === 'Più filtri'){
          moreFilters.style.display = 'grid';
          e.target.textContent = 'Meno filtri';
      }else{
          moreFilters.style.display = 'none';
          e.target.textContent = 'Più filtri';
      }
    }else if(e.target.id === 'reset-filters'){//Reset filtri
      document.getElementById("filters").querySelectorAll("select").forEach(sel => {
        sel.value = "";
      });

      const sites = await getSites();
      markSites(sites);

      // Nascondi il filtro comune
      document.querySelector('.comune-group').style.display = 'none';
    }
  });
});

//Modifica comuni in form aggiunta sito
document.querySelector("#aggiungiSito").querySelector('.provincia').addEventListener('change', async function (e) {
  try{
    const comuni = await getComuni(e.target.value);

    const comuniPresenti = new Set();
    const comuneSelect = document.querySelector("#aggiungiSito").querySelector('.comune');

    comuni.forEach(c => {
      if(!comuniPresenti.has(c)){
        comuniPresenti.add(c.toUpperCase());
      }
    });

    populateSelect(comuneSelect, comuniPresenti);
  }catch(e){
    console.error('Errore nella GET: ', e);
  }
});

document.getElementById("aggiungiSito").querySelector("form").addEventListener("submit", async function (e) {
    e.preventDefault();
    
    const formData = new FormData(this);
    const objData = Object.fromEntries(formData.entries())
    const data = JSON.stringify(objData);
    
    try{
      await addSite(data);
      sites = await getSites();

      updateDefaultCard();
      showPopup('default', true);
    }catch(e){
      showPopup('default');
      console.log(e);
    }

    this.reset();
});

//Infopanel, modifica, delete
document.addEventListener('click', async (event) => {
  const button = event.target.closest('button');

  if (!button) return;

  const codice = button.getAttribute('data-id');
  const sito = sites.find(s => s.codice === codice);

  // SHOW MORE
  if (button.classList.contains('show-more-btn')) {
    if (sito){ 
      showMore(sito);
      document.querySelector('.modify-btn').setAttribute('data-id', sito.codice);
      document.querySelector('.delete-btn').setAttribute('data-id', sito.codice);
    }
  }

  // MODIFY
  if (button.classList.contains('modify-btn')) {
    showEditForm(sito);
  }

  //DELETE
  if(button.classList.contains('delete-btn')){
    if(confirm("Eliminare questo sito dalla mappa? L'operazione non è reversibile.")){
      try{
        await deleteSite(sito.codice);
        const marker = markersMap[sito.codice];

        if (marker) {
          map.removeLayer(marker);
          delete markersMap[sito.codice];
        } else {
          console.warn(`Nessun marker trovato per il codice ${sito.codice}`);
        }

        sites = await getSites();
        updateDefaultCard();
        showLess();
        showPopup('default', true);
      }catch(e){
        showPopup('default');
        console.log(e);
      }
    } else {
      console.log("Annullato");
    }
  }
});

//Submit form modifica sito
document.getElementById('modificaSito').querySelector('form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const codice = document.querySelector('.modify-btn').getAttribute('data-id');
    const sito = sites.find(s => s.codice === codice);
    const formData = new FormData(e.target);
    const objData = Object.fromEntries(formData.entries());
    console.log(objData);
    Object.assign(sito, objData);

    try{
      await modifySite(sito);
      sites = await getSites();
      updateDefaultCard();
      showMore(sito);
      showPopup('infopanel', true);
    }catch(e){
      showMore(sito);
      showPopup('infopanel');
      console.log(e);
    }
});