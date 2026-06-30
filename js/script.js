document.addEventListener('DOMContentLoaded', () => {
    
    // ==========================================
    // 1. CONFIGURACIÓN
    // ==========================================
    const SUPABASE_URL = 'https://hfapwgnmnbywcruvxlvf.supabase.co'; 
    const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhmYXB3Z25tbmJ5d2NydXZ4bHZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI3ODA0NzcsImV4cCI6MjA5ODM1NjQ3N30.26ejUEA0ik_wKsLMwW9xLfmO1Xun7WRb5h1P0q6c4bA'; 
    
    const CLOUDINARY_CLOUD_NAME = 'xuhglwl4'; 
    const CLOUDINARY_UPLOAD_PRESET = 'promo_lithium'; 

    const galeriaGrid = document.getElementById('galeria-grid');
    const formSubir = document.getElementById('form-subir-foto');
    const mensajeEstado = document.getElementById('mensaje-estado');
    const btnSubmit = document.getElementById('btn-submit');

    // ==========================================
    // 2. LÓGICA PARA SUBIR LA FOTO
    // ==========================================
    if (formSubir) {
        formSubir.addEventListener('submit', async (e) => {
            e.preventDefault(); 

            const archivo = document.getElementById('input-archivo').files[0];
            const titulo = document.getElementById('input-titulo').value;
            const esGrande = document.getElementById('input-grande').checked;

            if (!archivo) return;

            try {
                if (mensajeEstado) {
                    mensajeEstado.style.color = "blue";
                    mensajeEstado.textContent = "1/2 Subiendo foto a Cloudinary...";
                }
                if (btnSubmit) btnSubmit.disabled = true;

                // --- A. Enviar a Cloudinary ---
                const formData = new FormData();
                formData.append('file', archivo);
                formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

                const respuestaCloudinary = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
                    method: 'POST',
                    body: formData
                });

                const datosCloudinary = await respuestaCloudinary.json();
                
                if (!datosCloudinary.secure_url) {
                    throw new Error("Error al subir a Cloudinary");
                }

                const urlImagen = datosCloudinary.secure_url;

                // --- B. Guardar datos en Supabase ---
                if (mensajeEstado) mensajeEstado.textContent = "2/2 Guardando información en Supabase...";

                const registro = {
                    titulo: titulo,
                    url_imagen: urlImagen,
                    grande: esGrande
                };

                const respuestaSupabase = await fetch(`${SUPABASE_URL}/rest/v1/galeria`, {
                    method: 'POST',
                    headers: {
                        'apikey': SUPABASE_KEY,
                        'Authorization': `Bearer ${SUPABASE_KEY}`,
                        'Content-Type': 'application/json',
                        'Prefer': 'return=representation'
                    },
                    body: JSON.stringify(registro)
                });

                if (respuestaSupabase.ok) {
                    if (mensajeEstado) {
                        mensajeEstado.style.color = "green";
                        mensajeEstado.textContent = "¡Foto subida con éxito!";
                    }
                    formSubir.reset(); 
                    cargarGaleriaDesdeNube(); 
                } else {
                    throw new Error("Error al guardar en base de datos");
                }

            } catch (error) {
                console.error(error);
                if (mensajeEstado) {
                    mensajeEstado.style.color = "red";
                    mensajeEstado.textContent = "Hubo un error. Revisa la consola.";
                }
            } finally {
                if (btnSubmit) btnSubmit.disabled = false;
                setTimeout(() => { if (mensajeEstado) mensajeEstado.textContent = ""; }, 3000);
            }
        });
    }

    // ==========================================
    // 3. LÓGICA PARA MOSTRAR LA GALERÍA
    // ==========================================
    async function cargarGaleriaDesdeNube() {
        if (!galeriaGrid) return; // Si no estamos en la página de la galería, salir

        try {
            const respuesta = await fetch(`${SUPABASE_URL}/rest/v1/galeria?select=*&order=id.asc`, {
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${SUPABASE_KEY}`
                }
            });
            
            const datosGaleria = await respuesta.json();
            renderizarGaleria(datosGaleria);
            
        } catch (error) {
            console.error("Error al cargar fotos:", error);
            galeriaGrid.innerHTML = "<p>Error al cargar la galería.</p>";
        }
    }

    function renderizarGaleria(datos) {
        if (!galeriaGrid) return;

        if (datos.length === 0) {
            galeriaGrid.innerHTML = "<p style='text-align:center; grid-column: 1/-1;'>La galería está vacía. ¡Sube tu primera foto!</p>";
            return;
        }

        let htmlContenido = '';
        datos.forEach(item => {
            const claseTamano = item.grande ? ' item-grande' : '';
            htmlContenido += `
                <div class="galeria-item${claseTamano}">
                    <img src="${item.url_imagen}" alt="${item.titulo}">
                    <div class="galeria-overlay">
                        <h3>${item.titulo}</h3>
                    </div>
                </div>
            `;
        });

        galeriaGrid.innerHTML = htmlContenido;
        inicializarLightbox(); 
    }

    // ==========================================
    // 4. LÓGICA DEL LIGHTBOX
    // ==========================================
    function inicializarLightbox() {
        const lightbox = document.getElementById('lightbox');
        if (!lightbox) return;

        const items = document.querySelectorAll('.galeria-item');
        const lbImg = lightbox.querySelector('.lightbox-img');
        const lbCaption = lightbox.querySelector('.lightbox-caption');
        const btnClose = lightbox.querySelector('.lightbox-close');
        const btnNext = lightbox.querySelector('.lightbox-next');
        const btnPrev = lightbox.querySelector('.lightbox-prev');
        let currentIndex = 0;

        if (!btnClose || !btnNext || !btnPrev) return;

        // Remover eventos anteriores clonando botones
        const newBtnClose = btnClose.cloneNode(true);
        btnClose.parentNode.replaceChild(newBtnClose, btnClose);
        
        const newBtnNext = btnNext.cloneNode(true);
        btnNext.parentNode.replaceChild(newBtnNext, btnNext);
        
        const newBtnPrev = btnPrev.cloneNode(true);
        btnPrev.parentNode.replaceChild(newBtnPrev, btnPrev);

        function openLightbox(index) {
            if(items.length === 0) return;
            const item = items[index];
            const img = item.querySelector('img');
            const captionEl = item.querySelector('.galeria-overlay h3');
            lbImg.src = img.src;
            lbImg.alt = img.alt || '';
            lbCaption.textContent = captionEl ? captionEl.textContent : '';
            lightbox.classList.add('open');
            lightbox.setAttribute('aria-hidden', 'false');
            currentIndex = index;
        }

        function closeLightbox() {
            lightbox.classList.remove('open');
            lightbox.setAttribute('aria-hidden', 'true');
        }

        items.forEach((it, i) => {
            it.addEventListener('click', () => openLightbox(i));
        });

        newBtnClose.addEventListener('click', closeLightbox);
        newBtnNext.addEventListener('click', () => openLightbox((currentIndex + 1) % items.length));
        newBtnPrev.addEventListener('click', () => openLightbox((currentIndex - 1 + items.length) % items.length));

        lightbox.onclick = (e) => {
            if (e.target === lightbox) closeLightbox();
        };

        document.onkeydown = (e) => {
            if (lightbox.classList.contains('open')) {
                if (e.key === 'Escape') closeLightbox();
                if (e.key === 'ArrowRight') openLightbox((currentIndex + 1) % items.length);
                if (e.key === 'ArrowLeft') openLightbox((currentIndex - 1 + items.length) % items.length);
            }
        };
    }

    // Arrancar la galería al entrar a la página
    cargarGaleriaDesdeNube();
});