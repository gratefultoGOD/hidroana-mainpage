// ── Navbar scroll effect ──
const navbar = document.getElementById('navbar');
if (navbar) {
    window.addEventListener('scroll', () => {
        navbar.classList.toggle('scrolled', window.scrollY > 50);
    });
}

// ── Mobile menu toggle ──
const mobileToggle = document.getElementById('mobileToggle');
const navLinks = document.getElementById('navLinks');
if (mobileToggle && navLinks) {
    mobileToggle.addEventListener('click', () => {
        navLinks.classList.toggle('open');
        mobileToggle.innerHTML = navLinks.classList.contains('open') ? '&#10005;' : '&#9776;';
    });
    // Close mobile menu on link click
    navLinks.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            navLinks.classList.remove('open');
            mobileToggle.innerHTML = '&#9776;';
        });
    });
}

// ── Intersection Observer for scroll reveal ──
const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('active');
            revealObserver.unobserve(entry.target);
        }
    });
}, { threshold: 0.12 });

document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

// ── Contact form handler ──
const contactForm = document.getElementById('contactForm');
if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const btn = contactForm.querySelector('.btn');
        const originalText = btn.textContent;
        btn.textContent = 'Gönderildi';
        btn.style.opacity = '0.7';
        btn.disabled = true;
        setTimeout(() => {
            btn.textContent = originalText;
            btn.style.opacity = '';
            btn.disabled = false;
            contactForm.reset();
        }, 3000);
    });
}

// ── Smooth scroll for anchor links ──
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
        const href = anchor.getAttribute('href');
        if (href === '#') return;
        e.preventDefault();
        const target = document.querySelector(href);
        if (target) target.scrollIntoView({ behavior: 'smooth' });
    });
});

// ── Vehicles Carousel ──
(function() {
    const track = document.getElementById('carouselTrack');
    const prevBtn = document.getElementById('carouselPrev');
    const nextBtn = document.getElementById('carouselNext');
    const dotsContainer = document.getElementById('carouselDots');
    const counter = document.getElementById('carouselCounter');
    if (!track) return;

    const slides = track.querySelectorAll('.carousel-slide');
    const total = slides.length;
    let current = 0;
    let autoInterval = null;
    const AUTO_DELAY = 5000;

    // Build dots
    slides.forEach((_, i) => {
        const dot = document.createElement('button');
        dot.className = 'carousel-dot' + (i === 0 ? ' active' : '');
        dot.setAttribute('aria-label', 'Slide ' + (i + 1));
        dot.addEventListener('click', () => goTo(i));
        dotsContainer.appendChild(dot);
    });

    function goTo(index) {
        current = ((index % total) + total) % total;
        track.style.transform = 'translateX(-' + (current * 100) + '%)';
        // Update dots
        dotsContainer.querySelectorAll('.carousel-dot').forEach((d, i) => {
            d.classList.toggle('active', i === current);
        });
        // Update counter
        if (counter) counter.textContent = (current + 1) + ' / ' + total;
    }

    function next() { goTo(current + 1); }
    function prev() { goTo(current - 1); }

    // Arrow buttons
    if (prevBtn) prevBtn.addEventListener('click', () => { prev(); resetAuto(); });
    if (nextBtn) nextBtn.addEventListener('click', () => { next(); resetAuto(); });

    // Auto-scroll
    function startAuto() { autoInterval = setInterval(next, AUTO_DELAY); }
    function stopAuto() { clearInterval(autoInterval); }
    function resetAuto() { stopAuto(); startAuto(); }

    startAuto();

    // Pause on hover
    const carousel = document.getElementById('vehiclesCarousel');
    if (carousel) {
        carousel.addEventListener('mouseenter', stopAuto);
        carousel.addEventListener('mouseleave', startAuto);
    }

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft') { prev(); resetAuto(); }
        if (e.key === 'ArrowRight') { next(); resetAuto(); }
    });

    // Touch swipe support
    let touchStartX = 0;
    let touchEndX = 0;
    if (carousel) {
        carousel.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
        }, { passive: true });
        carousel.addEventListener('touchend', (e) => {
            touchEndX = e.changedTouches[0].screenX;
            const diff = touchStartX - touchEndX;
            if (Math.abs(diff) > 50) {
                if (diff > 0) next(); else prev();
                resetAuto();
            }
        }, { passive: true });
    }
})();
