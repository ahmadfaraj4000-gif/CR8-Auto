(function () {
  "use strict";

  /************************************************************
   * CR8 AUTOS SMART RECEPTIONIST V3 — EXPANDED PRODUCTION
   * No AI API. Rules + phrase engine + fuzzy matching.
   *
   * File name:
   * ai-receptionist-v3.js
   *
   * Add before </body>:
   * <script src="ai-receptionist-v3.js"></script>
   ************************************************************/

  const CONFIG = {
    businessName: "CR8 Autos",
    phoneDisplay: "(518) 495-6876",
    phoneHref: "tel:+15184956876",
    address: "2603 2nd Ave, Watervliet, NY 12189",
    cityArea: "Watervliet / Albany",
    mapsUrl:
      "https://www.google.com/maps/search/?api=1&query=2603+2nd+Ave+Watervliet+NY+12189",

    openHour: 8,
    openMinute: 30,
    closeHour: 16,
    closeMinute: 30,

    hoursText: "Monday to Friday, 8:30 AM to 4:30 PM",
    hoursTextEs: "Lunes a viernes, 8:30 AM a 4:30 PM",

    SUPABASE_URL: "https://llrjzyhdphitrjzbstoq.supabase.co",
    SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxscmp6eWhkcGhpdHJqemJzdG9xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3MTc1NDUsImV4cCI6MjA5MjI5MzU0NX0.3ml84Lp1AqUlwUV8xkgNwmrZ7Bdg1NYtzPq3khcXMHY",

    bookingsTable: "bookings",
    unknownTable: "receptionist_unknown_messages",
    leadsTable: "receptionist_leads",
    source: "ai_receptionist_v3"
  };

  const state = {
    open: false,
    lang: "en",
    step: null,
    lastIntent: null,
    lastRepairIntent: null,
    chatHistory: [],
    booking: freshBooking(),
    lead: freshLead(),
    leadSaved: false,
    greeted: false
  };

  function freshBooking() {
    return {
      name: "",
      phone: "",
      email: "",
      vehicle: "",
      service: "",
      appointment_date: "",
      appointment_time: "",
      notes: "",
      conversation_summary: ""
    };
  }

  function freshLead() {
    return {
      name: "",
      phone: "",
      vehicle: "",
      need: "",
      language: "en"
    };
  }

  const INTENTS = {
    booking: [
      "book", "booking", "appointment", "schedule", "set up", "set up appointment",
      "make appointment", "need appointment", "i need an appointment",
      "request appointment", "when can i come", "can i come in", "bring my car",
      "bring car", "drop off", "drop my car", "come by", "come today",
      "come tomorrow", "available today", "available tomorrow", "availability",
      "look at my car", "look at it", "check my car", "can you check it",
      "cita", "hacer cita", "pedir cita", "quiero cita", "necesito cita",
      "agendar", "programar", "reservar", "llevar mi carro", "traer mi carro",
      "dejar mi carro", "puedo ir", "puedo pasar", "disponible", "disponibilidad",
      "revisar mi carro", "mirar mi carro", "chequear mi carro"
    ],

    estimate: [
      "estimate", "free estimate", "quote", "pricing", "price", "cost",
      "how much", "how much is it", "how much would it cost", "what does it cost",
      "rough price", "ballpark", "give me a price", "need price", "need quote",
      "can you price it", "inspection price", "diagnostic price", "take a look",
      "look at damage", "look at the damage", "how much to fix", "cost to fix",
      "estimate appointment", "free quote",
      "estimado", "estimación", "cotizacion", "cotización", "precio",
      "cuanto", "cuánto", "cuanto cuesta", "cuánto cuesta", "cuanto sale",
      "cuánto sale", "dar precio", "me dan precio", "precio aproximado",
      "revisar para precio", "estimado gratis", "cuanto para arreglar",
      "cuánto para arreglar", "cuanto cobran", "cuánto cobran"
    ],

    hours: [
      "hours", "business hours", "open", "close", "closed", "what time",
      "what time open", "what time close", "are you open", "open today",
      "open tomorrow", "open saturday", "open sunday", "weekend", "holiday",
      "when do you open", "when do you close",
      "horario", "horarios", "abren", "cierran", "abierto", "cerrado",
      "estan abiertos", "están abiertos", "a que hora abren", "a qué hora abren",
      "a que hora cierran", "a qué hora cierran", "abren hoy", "abren mañana",
      "sabado", "sábado", "domingo", "fin de semana"
    ],

    location: [
      "location", "address", "where are you", "where located", "directions",
      "map", "google maps", "near me", "near albany", "watervliet",
      "capital region", "how do i get there", "shop address", "where is shop",
      "ubicacion", "ubicación", "direccion", "dirección", "donde estan",
      "dónde están", "donde queda", "dónde queda", "como llego", "cómo llego",
      "mapa", "cerca de albany", "watervliet", "capital region"
    ],

    phone: [
      "phone", "number", "telephone", "call", "call you", "contact",
      "contact number", "what is your number", "shop number",
      "telefono", "teléfono", "numero", "número", "llamar", "contacto",
      "cual es el numero", "cuál es el número"
    ],

    insurance: [
      "insurance", "claim", "insurance claim", "adjuster", "deductible",
      "supplement", "insurance estimate", "insurance company", "geico",
      "progressive", "state farm", "allstate", "liberty mutual", "nationwide",
      "travelers", "usaa", "farmers", "do you take insurance", "work with insurance",
      "seguro", "aseguranza", "reclamo", "deducible", "ajustador",
      "compañía de seguro", "compania de seguro", "trabajan con seguro",
      "aceptan seguro", "estimado de seguro"
    ],

    outOfPocket: [
      "cash", "pay cash", "out of pocket", "pay myself", "self pay",
      "no insurance", "without insurance", "don’t want insurance", "dont want insurance",
      "cheap", "cheaper", "budget", "affordable", "lowest price", "save money",
      "not through insurance", "can i pay cash",
      "efectivo", "cash", "pago cash", "pagar cash", "pago de bolsillo",
      "de bolsillo", "sin seguro", "no tengo seguro", "pagar yo",
      "barato", "mas barato", "más barato", "economico", "económico",
      "no quiero usar seguro"
    ],

    collision: [
      "accident", "collision", "crash", "wreck", "hit", "got hit",
      "rear ended", "rear-end", "side swipe", "sideswiped", "fender bender",
      "body work", "auto body", "body damage", "panel damage", "door damage",
      "quarter panel", "fender", "hood damage", "trunk damage", "frame damage",
      "hit a deer", "deer hit", "parking lot damage", "someone hit me",
      "front end damage", "rear damage", "side damage",
      "choque", "accidente", "chocado", "me chocaron", "me dieron",
      "le dieron", "golpe", "golpeado", "carroceria", "carrocería",
      "daño de choque", "daño de choque", "daño de accidente", "puerta dañada",
      "guardalodo", "cofre", "maletero", "panel", "me pegaron"
    ],

    bumper: [
      "bumper", "front bumper", "rear bumper", "bumper cover",
      "bumper hanging", "bumper cracked", "bumper loose", "bumper fell off",
      "replace bumper", "repair bumper", "fix bumper", "bumper dent",
      "bumper scratched", "bumper popped out",
      "defensa", "parachoques", "bumper suelto", "defensa rota",
      "defensa colgando", "parachoques roto", "parachoques suelto",
      "defensa se cayo", "defensa salida", "defensa rayada"
    ],

    paint: [
      "paint", "paint job", "paint work", "repaint", "paint match",
      "color match", "blend paint", "clear coat", "clearcoat", "peeling paint",
      "faded paint", "scratch", "scratches", "key scratch", "touch up",
      "rock chips", "paint correction", "spray", "paint bumper",
      "pintura", "pintar", "repintar", "igualar color", "mezclar pintura",
      "rayon", "rayón", "rayones", "rasguño", "rasguños", "barniz",
      "clear coat", "pintura pelada", "pintura quemada", "retoque"
    ],

    rust: [
      "rust", "rust repair", "rusted", "rust hole", "rust holes",
      "rocker panel", "rockers", "undercoating", "undercoat", "welding",
      "metal work", "fabrication", "truck bed", "bed rust", "frame rust",
      "floor rust", "wheel well rust", "corrosion", "salt damage",
      "oxido", "óxido", "oxidado", "hoyo de oxido", "hoyo de óxido",
      "corrosion", "corrosión", "soldadura", "panel oxidado",
      "cama de troca", "troca oxidada", "chasis oxidado", "sal de carretera",
      "rocker", "undercoating"
    ],

    brakes: [
      "brake", "brakes", "brake pads", "pads", "rotors", "caliper",
      "brake line", "abs", "brake light", "squeaking", "squealing",
      "grinding", "soft pedal", "brake pedal", "brakes grinding",
      "brakes squeak", "frenos", "pastillas", "discos", "caliper",
      "linea de freno", "línea de freno", "abs", "chillando",
      "rechinan", "ruido al frenar", "pedal suave", "freno"
    ],

    diagnostic: [
      "check engine", "engine light", "warning light", "diagnostic",
      "scanner", "code", "engine code", "overheating", "over heat",
      "won't start", "wont start", "no start", "car won't start",
      "battery light", "oil light", "engine problem", "misfire",
      "shaking", "rough idle", "sensor", "oxygen sensor", "o2 sensor",
      "luz del motor", "check engine", "diagnostico", "diagnóstico",
      "scanner", "codigo", "código", "se calienta", "calentando",
      "no prende", "no arranca", "bateria", "batería", "luz de aceite",
      "tiembla", "sensor", "falla"
    ],

    suspension: [
      "suspension", "steering", "tie rod", "ball joint", "control arm",
      "strut", "shock", "wheel bearing", "axle", "alignment", "clunking",
      "noise when turning", "suspension noise",
      "suspension", "suspensión", "direccion", "dirección", "terminal",
      "rotula", "rótula", "brazo de control", "amortiguador",
      "bearing", "ruido al doblar", "alineacion", "alineación"
    ],

    exhaust: [
      "exhaust", "muffler", "catalytic converter", "cat converter",
      "loud exhaust", "exhaust leak", "pipe", "emissions",
      "escape", "mofle", "catalitico", "catalítico", "ruido de escape",
      "emisiones", "pipa de escape"
    ],

    tires: [
      "tire", "tires", "flat tire", "flat", "mount", "balance",
      "rotation", "tire rotation", "patch tire", "plug tire",
      "seasonal tires", "snow tires", "tire leak",
      "llanta", "llantas", "goma", "gomas", "ponchada", "neumatico",
      "neumático", "rotacion", "rotación", "balanceo", "montar llanta",
      "parchar llanta", "llanta perdiendo aire"
    ],

    glass: [
      "glass", "windshield", "window", "mirror", "cracked windshield",
      "auto glass", "side glass", "rear glass", "broken window",
      "side mirror", "mirror replacement",
      "cristal", "vidrio", "parabrisas", "ventana", "espejo",
      "cristal roto", "vidrio roto", "espejo roto"
    ],

    key: [
      "key", "key fob", "remote", "program key", "lost key", "spare key",
      "key programming", "fob programming", "car remote",
      "llave", "control", "key fob", "programar llave", "perdi la llave",
      "perdí la llave", "llave extra", "control remoto"
    ],

    inspection: [
      "inspection", "nys inspection", "emissions", "inspection failed",
      "fail inspection", "pass inspection", "inspection prep",
      "inspeccion", "inspección", "emisiones", "no paso inspeccion",
      "no pasó inspección", "pasar inspeccion", "pasar inspección"
    ],

    photos: [
      "photo", "picture", "pictures", "send photos", "send pictures",
      "upload photo", "upload pictures", "can i send photos", "images",
      "foto", "fotos", "mandar fotos", "enviar fotos", "subir fotos",
      "puedo mandar fotos", "imagenes", "imágenes"
    ],

    timeline: [
      "how long", "turnaround", "same day", "today", "tomorrow",
      "next week", "how many days", "how long does repair take",
      "when will it be done", "repair time",
      "cuanto tarda", "cuánto tarda", "hoy", "mañana", "mismo dia",
      "mismo día", "proxima semana", "próxima semana", "cuantos dias",
      "cuántos días", "tiempo de reparación"
    ],

    towing: [
      "tow", "towing", "tow truck", "car not drivable", "can't drive it",
      "cant drive it", "needs tow", "flatbed",
      "grua", "grúa", "tow", "no se puede manejar", "no puedo manejar",
      "necesita grua", "necesita grúa"
    ],

    rental: [
      "rental", "rental car", "loaner", "loaner car", "do you have rental",
      "rent a car while repaired",
      "renta", "carro rentado", "rental car", "prestado", "carro prestado"
    ],

    payment: [
      "payment", "pay", "card", "credit card", "debit", "financing",
      "payment plan", "deposit", "cash app", "zelle",
      "pago", "tarjeta", "credito", "crédito", "debito", "débito",
      "financiamiento", "plan de pago", "deposito", "depósito"
    ],

    warranty: [
      "warranty", "guarantee", "guaranteed", "do you guarantee",
      "garantia", "garantía", "garantizan"
    ],

    services: [
      "what services", "what do you do", "services", "do you fix cars",
      "mechanic and body", "auto repair", "body shop",
      "servicios", "que hacen", "qué hacen", "arreglan carros",
      "mecanica", "mecánica", "auto body"
    ],

    careers: [
      "job", "hiring", "career", "work for you", "mechanic job",
      "auto body job", "body tech", "painter job", "helper job",
      "trabajo", "empleo", "contratando", "buscan gente",
      "mecanico", "mecánico", "chapista", "pintor", "ayudante"
    ],

    spanish: [
      "spanish", "espanol", "español", "habla español", "hablan español",
      "puedes hablar español", "en español", "hablo espanol", "hablo español"
    ],

    english: [
      "english", "ingles", "inglés", "speak english", "habla ingles", "habla inglés"
    ],

    greeting: [
      "hi", "hello", "hey", "good morning", "good afternoon",
      "hola", "buenos dias", "buenos días", "buenas tardes", "buenas"
    ],

    thanks: [
      "thanks", "thank you", "appreciate it", "gracias", "muchas gracias"
    ]
  };

  const REPLIES = {
    en: {
      greeting:
        "Hi, welcome to CR8 Autos. I can help with estimates, appointments, insurance questions, out-of-pocket repairs, hours, location, collision repair, paint, rust, brakes, diagnostics, tires, glass, key fobs, and more. What do you need help with?",
      fallback:
        "I can help with that. Tell me what vehicle you have and what problem you’re dealing with, and I’ll point you in the right direction. I can also help book an estimate.",
      bookingStart:
        "Absolutely. I can help request an appointment. What is your full name?",
      askPhone:
        "Thanks. What is the best phone number to reach you?",
      askVehicle:
        "What vehicle do you have? Example: 2018 Honda Accord.",
      askService:
        "What do you need help with? Example: bumper damage, brakes, rust repair, check engine light, paint, accident damage, etc.",
      askDate:
        "What date would you prefer? You can type a date like 2026-05-01, or say tomorrow, Friday, next Monday, etc. We are open Monday to Friday.",
      askTime:
        "What time works best? We are open 8:30 AM to 4:30 PM.",
      askNotes:
        "Any extra details about the repair or damage? You can keep it short.",
      success:
        "Your request was sent to CR8 Autos. Someone from the shop will contact you shortly.",
      error:
        "I had trouble sending that request. Please call CR8 Autos directly at (518) 495-6876.",
      hours:
        "CR8 Autos is open Monday to Friday, 8:30 AM to 4:30 PM.",
      location:
        "CR8 Autos is located at 2603 2nd Ave, Watervliet, NY 12189. We serve Watervliet, Albany, Troy, Cohoes, Colonie, Schenectady, and the Capital Region.",
      phone:
        "You can call CR8 Autos at (518) 495-6876.",
      estimate:
        "Yes, we can help with an estimate. Pricing depends on the damage, so the best next step is to bring the vehicle in so the shop can inspect it properly. I can help request an appointment.",
      insurance:
        "Yes, CR8 Autos can help with insurance-related repairs. You have the right to choose your own repair shop. The shop can inspect the vehicle, document the damage, and help with the estimate process.",
      outOfPocket:
        "Yes, CR8 Autos works with out-of-pocket customers. The shop can inspect the damage and explain repair options before you commit to anything.",
      collision:
        "Yes, CR8 Autos handles collision and auto body repair, including dents, damaged panels, bumpers, paint, frame-related damage, and accident repairs. The best next step is an estimate visit.",
      bumper:
        "Yes, we repair front and rear bumper damage, including cracked, loose, hanging, scratched, popped-out, or collision-damaged bumpers. An in-person estimate is best so the shop can tell whether it can be repaired or needs replacement.",
      paint:
        "Yes, CR8 Autos handles paint work and refinishing, including scratches, repainting, blending, color matching, touch-ups, peeling clear coat, and bumper paint.",
      rust:
        "Yes, CR8 Autos handles rust repair, rocker panels, welding, undercoating, corrosion repair, frame rust questions, wheel well rust, and truck bed restoration.",
      brakes:
        "Yes, CR8 Autos handles brake service and repair, including pads, rotors, grinding, squeaking, brake inspections, calipers, brake lines, and ABS-related concerns.",
      diagnostic:
        "Yes, CR8 Autos handles diagnostics, including check engine lights, overheating, no-start issues, warning lights, sensors, misfires, shaking, and performance problems.",
      suspension:
        "Yes, CR8 Autos can help with suspension and steering concerns like clunking noises, tie rods, ball joints, control arms, shocks, struts, wheel bearings, axles, and alignment-related symptoms.",
      exhaust:
        "Yes, CR8 Autos can help with exhaust issues including mufflers, exhaust leaks, loud exhaust noise, pipes, catalytic converter concerns, and emissions-related problems.",
      tires:
        "Yes, CR8 Autos can help with tire services like mounting, balancing, rotation, flat repair, patching, seasonal tire swaps, and tire leaks.",
      glass:
        "Yes, CR8 Autos can help with glass-related damage, including windshields, windows, mirrors, side glass, and broken window questions.",
      key:
        "Yes, CR8 Autos can help with key fob replacement and programming for many vehicles.",
      inspection:
        "Yes, CR8 Autos can help with NYS inspection and emissions prep. If your vehicle failed inspection, the shop can diagnose what needs to be repaired.",
      photos:
        "Photos are helpful, but an in-person inspection is best for accurate pricing. You can book an estimate so the shop can review the vehicle properly.",
      timeline:
        "Repair time depends on the damage, parts availability, insurance process, and type of work. Small jobs may be quicker, while collision, paint, rust, or parts-related repairs can take longer. The shop can give a better timeline after inspecting the vehicle.",
      towing:
        "If the vehicle is not safe to drive, it may need towing. CR8 Autos can still inspect and estimate the repair once the vehicle gets to the shop. Call the shop for the best next step.",
      rental:
        "Rental coverage usually depends on your insurance policy. CR8 Autos can help with the repair side, and your insurance company can confirm rental coverage if it applies.",
      payment:
        "Payment options can depend on the repair. For the most accurate answer, call CR8 Autos or discuss it during your estimate visit.",
      warranty:
        "CR8 Autos focuses on quality repair work and clear communication. For warranty or guarantee details, ask the shop directly during your estimate so they can explain what applies to your repair.",
      services:
        "CR8 Autos handles auto body and mechanic services, including collision repair, paint, rust repair, welding, undercoating, brakes, diagnostics, suspension, exhaust, tires, glass, key fobs, and more.",
      careers:
        "For mechanic or auto body job openings, call CR8 Autos or stop by during business hours. The shop may be looking for experienced mechanics, body techs, painters, or helpers.",
      thanks:
        "You’re welcome. Would you like me to help request an appointment?",
      invalidDate:
        "Please enter a valid weekday date. You can type something like 2026-05-01, tomorrow, Friday, or next Monday.",
      invalidTime:
        "Please choose a time between 8:30 AM and 4:30 PM.",
      weekend:
        "CR8 Autos is open Monday to Friday. Please choose a weekday.",
      leadAsk:
        "I can have the shop follow up. What is your name?",
      leadPhone:
        "What phone number should the shop use to contact you?",
      leadVehicle:
        "What vehicle do you have?",
      leadNeed:
        "Briefly, what do you need help with?"
    },

    es: {
      greeting:
        "Hola, bienvenido a CR8 Autos. Puedo ayudar con estimados, citas, seguro, pagos de bolsillo, horario, ubicación, choques, pintura, óxido, frenos, diagnósticos, llantas, cristales, llaves y más. ¿En qué le puedo ayudar?",
      fallback:
        "Puedo ayudar con eso. Dígame qué vehículo tiene y cuál es el problema, y le digo el mejor próximo paso. También puedo ayudarle a pedir una cita para estimado.",
      bookingStart:
        "Claro. Puedo ayudar a pedir una cita. ¿Cuál es su nombre completo?",
      askPhone:
        "Gracias. ¿Cuál es el mejor número de teléfono para contactarlo?",
      askVehicle:
        "¿Qué vehículo tiene? Ejemplo: Honda Accord 2018.",
      askService:
        "¿Qué servicio necesita? Ejemplo: defensa, frenos, óxido, check engine, pintura, choque, etc.",
      askDate:
        "¿Qué fecha prefiere? Puede escribir algo como 2026-05-01, mañana, viernes, próximo lunes, etc. Abrimos lunes a viernes.",
      askTime:
        "¿Qué hora le conviene? Abrimos de 8:30 AM a 4:30 PM.",
      askNotes:
        "¿Algún detalle adicional sobre el daño o reparación?",
      success:
        "Su solicitud fue enviada a CR8 Autos. Alguien del taller se comunicará pronto.",
      error:
        "Tuve problema enviando la solicitud. Por favor llame directamente a CR8 Autos al (518) 495-6876.",
      hours:
        "CR8 Autos abre de lunes a viernes, 8:30 AM a 4:30 PM.",
      location:
        "CR8 Autos está en 2603 2nd Ave, Watervliet, NY 12189. Servimos Watervliet, Albany, Troy, Cohoes, Colonie, Schenectady y el Capital Region.",
      phone:
        "Puede llamar a CR8 Autos al (518) 495-6876.",
      estimate:
        "Sí, podemos ayudar con un estimado. El precio depende del daño, por eso lo mejor es traer el vehículo para revisarlo bien en persona. Puedo ayudarle a pedir una cita.",
      insurance:
        "Sí, CR8 Autos puede ayudar con reparaciones relacionadas con seguro. Usted tiene derecho a escoger su propio taller. El taller puede revisar el vehículo, documentar el daño y ayudar con el proceso del estimado.",
      outOfPocket:
        "Sí, CR8 Autos trabaja con clientes que pagan de bolsillo. El taller puede revisar el daño y explicar opciones antes de que usted se comprometa.",
      collision:
        "Sí, CR8 Autos hace reparación de choques y auto body, incluyendo golpes, paneles dañados, defensas, pintura, daños de accidente y daños relacionados con estructura. Lo mejor es una cita para estimado.",
      bumper:
        "Sí, reparamos defensas/parachoques delanteros y traseros, incluyendo defensas rotas, sueltas, rayadas, salidas o colgando. Es mejor verlo en persona para saber si se repara o se reemplaza.",
      paint:
        "Sí, CR8 Autos hace pintura, repintado, mezcla de color, rayones, retoques, problemas de barniz/clear coat y pintura de defensas.",
      rust:
        "Sí, CR8 Autos repara óxido, rocker panels, soldadura, undercoating, corrosión, óxido de chasis, wheel wells y restauración de camas de troca.",
      brakes:
        "Sí, CR8 Autos hace servicio y reparación de frenos, incluyendo pastillas, discos, ruido, rechinido, inspección de frenos, calipers, líneas de freno y problemas de ABS.",
      diagnostic:
        "Sí, CR8 Autos hace diagnósticos, incluyendo check engine, calentamiento, problemas cuando el carro no prende, luces de advertencia, sensores, fallas, temblores y problemas de rendimiento.",
      suspension:
        "Sí, CR8 Autos puede ayudar con suspensión y dirección, incluyendo ruidos, terminales, rótulas, brazos de control, amortiguadores, wheel bearings, ejes y síntomas de alineación.",
      exhaust:
        "Sí, CR8 Autos puede ayudar con problemas de escape, mofle, fugas de escape, ruido fuerte, pipas, catalítico y problemas relacionados con emisiones.",
      tires:
        "Sí, CR8 Autos puede ayudar con llantas, montaje, balanceo, rotación, reparación de ponchaduras, cambios de temporada y llantas perdiendo aire.",
      glass:
        "Sí, CR8 Autos puede ayudar con cristales, parabrisas, ventanas, espejos, vidrios laterales y preguntas sobre cristales rotos.",
      key:
        "Sí, CR8 Autos puede ayudar con reemplazo y programación de key fobs para muchos vehículos.",
      inspection:
        "Sí, CR8 Autos puede ayudar con inspección de NYS y preparación de emisiones. Si su vehículo no pasó inspección, el taller puede diagnosticar qué necesita reparación.",
      photos:
        "Las fotos ayudan, pero para precio exacto es mejor revisar el vehículo en persona. Puedo ayudarle a pedir una cita para estimado.",
      timeline:
        "El tiempo depende del daño, disponibilidad de piezas, proceso de seguro y tipo de reparación. Trabajos pequeños pueden ser más rápidos, pero choques, pintura, óxido o piezas pueden tardar más. El taller puede darle mejor tiempo después de revisar el vehículo.",
      towing:
        "Si el vehículo no se puede manejar de forma segura, puede necesitar grúa. CR8 Autos todavía puede revisar y estimar la reparación cuando el vehículo llegue al taller. Llame al taller para el mejor próximo paso.",
      rental:
        "La cobertura de carro rentado normalmente depende de su póliza de seguro. CR8 Autos puede ayudar con la reparación, y su seguro puede confirmar si tiene cobertura de rental.",
      payment:
        "Las opciones de pago pueden depender de la reparación. Para una respuesta exacta, llame a CR8 Autos o pregunte durante su visita de estimado.",
      warranty:
        "CR8 Autos se enfoca en trabajo de calidad y comunicación clara. Para detalles de garantía, pregunte directamente durante el estimado para saber qué aplica a su reparación.",
      services:
        "CR8 Autos hace auto body y mecánica, incluyendo choques, pintura, óxido, soldadura, undercoating, frenos, diagnósticos, suspensión, escape, llantas, cristales, key fobs y más.",
      careers:
        "Para oportunidades de mecánico o técnico de auto body, llame a CR8 Autos o pase por el taller durante el horario. El taller puede estar buscando mecánicos, body techs, pintores o ayudantes con experiencia.",
      thanks:
        "De nada. ¿Quiere que le ayude a pedir una cita?",
      invalidDate:
        "Por favor escriba una fecha válida de lunes a viernes. Puede escribir algo como 2026-05-01, mañana, viernes, o próximo lunes.",
      invalidTime:
        "Por favor escoja una hora entre 8:30 AM y 4:30 PM.",
      weekend:
        "CR8 Autos abre de lunes a viernes. Por favor escoja un día de semana.",
      leadAsk:
        "Puedo pedir que el taller le dé seguimiento. ¿Cuál es su nombre?",
      leadPhone:
        "¿Qué número de teléfono debe usar el taller para contactarlo?",
      leadVehicle:
        "¿Qué vehículo tiene?",
      leadNeed:
        "Brevemente, ¿con qué necesita ayuda?"
    }
  };

  function injectStyles() {
    const style = document.createElement("style");
    style.textContent = `
        #cr8-v3-button{
        position:fixed;
        right:18px;
        bottom:18px;
        width:56px;
        height:56px;
        border-radius:50%;
        border:1px solid rgba(255,255,255,.10);
        background:
            radial-gradient(circle at 30% 25%, #2a2a2a 0%, #111 35%, #050505 100%);
        color:#ffffff;
        z-index:999999;
        box-shadow:
            0 8px 24px rgba(0,0,0,.45),
            inset 0 1px 2px rgba(255,255,255,.08),
            inset 0 -3px 6px rgba(0,0,0,.45);
        cursor:pointer;
        font-size:20px;
        display:flex;
        align-items:center;
        justify-content:center;
        transition:all .22s ease;
        font-weight:900;
        letter-spacing:.5px;
        font-family:Arial,sans-serif;
        color:#e11d1d;
        text-shadow:0 0 8px rgba(225,29,29,.25);
        }

        #cr8-v3-button:hover{
        transform:translateY(-2px) scale(1.04);
        box-shadow:
            0 14px 30px rgba(0,0,0,.55),
            0 0 0 2px rgba(204,31,31,.45),
            inset 0 1px 2px rgba(255,255,255,.08);
        }

        #cr8-v3-button:active{
        transform:scale(.97);
        }
      #cr8-v3-badge{
        position:absolute;top:-5px;right:-5px;background:#fff;color:#cc1f1f;border-radius:999px;
        padding:4px 7px;font:800 11px Arial,sans-serif;
      }
      #cr8-v3-panel{
        position:fixed;right:22px;bottom:102px;width:430px;max-width:calc(100vw - 28px);
        height:680px;max-height:calc(100vh - 128px);background:#0d0d0d;color:#f5f5f5;
        border:1px solid #292929;border-radius:18px;overflow:hidden;display:none;flex-direction:column;
        z-index:999999;box-shadow:0 22px 70px rgba(0,0,0,.58);font-family:Arial,sans-serif;
      }
      #cr8-v3-header{
        background:linear-gradient(135deg,#cc1f1f,#7f1010);padding:15px 16px;display:flex;
        justify-content:space-between;align-items:center;
      }
      #cr8-v3-title{font-weight:900;letter-spacing:.3px;}
      #cr8-v3-subtitle{font-size:12px;opacity:.92;margin-top:3px;}
      #cr8-v3-close{
        width:31px;height:31px;border-radius:50%;border:1px solid rgba(255,255,255,.25);
        background:rgba(0,0,0,.22);color:#fff;cursor:pointer;font-size:19px;
      }
      #cr8-v3-log{
        flex:1;overflow-y:auto;padding:15px;background:
        radial-gradient(circle at top right,rgba(204,31,31,.12),transparent 32%),#0a0a0a;
      }
      .cr8-v3-msg{
        max-width:87%;padding:10px 12px;border-radius:14px;margin:9px 0;line-height:1.45;
        font-size:14px;white-space:pre-wrap;word-break:break-word;
      }
      .cr8-v3-bot{background:#191919;border:1px solid #2b2b2b;color:#f1f1f1;border-bottom-left-radius:4px;}
      .cr8-v3-user{background:#cc1f1f;color:#fff;margin-left:auto;border-bottom-right-radius:4px;}
      #cr8-v3-actions{
        display:flex;flex-wrap:wrap;gap:7px;padding:10px;border-top:1px solid #242424;background:#111;
      }
      .cr8-v3-chip{
        background:#171717;color:#f5f5f5;border:1px solid #333;border-radius:999px;padding:8px 10px;
        font-size:12px;cursor:pointer;transition:.2s;
      }
      .cr8-v3-chip:hover{border-color:#cc1f1f;transform:translateY(-1px);}
      #cr8-v3-small{
        font-size:12px;color:#aaa;padding:8px 12px;background:#101010;border-top:1px solid #222;
      }
      #cr8-v3-input-row{display:flex;border-top:1px solid #242424;background:#0f0f0f;}
      #cr8-v3-input{
        flex:1;border:none;outline:none;background:#0f0f0f;color:white;padding:15px;font-size:14px;
      }
      #cr8-v3-send{
        width:76px;border:none;background:#cc1f1f;color:white;font-weight:900;cursor:pointer;
      }
      @media(max-width:520px){
        #cr8-v3-panel{right:10px;left:10px;width:auto;bottom:90px;height:74vh;}
        #cr8-v3-button{right:16px;bottom:16px;}
      }
    `;
    document.head.appendChild(style);
  }

  function renderWidget() {
    document.body.insertAdjacentHTML(
      "beforeend",
      `
      <button id="cr8-v3-button" aria-label="Open CR8 Autos receptionist">
        CR8 <span id="cr8-v3-badge">1</span>
      </button>
      <div id="cr8-v3-panel">
        <div id="cr8-v3-header">
          <div>
            <div id="cr8-v3-title">CR8 Autos Receptionist</div>
            <div id="cr8-v3-subtitle">Estimates • Repairs • Booking • Español</div>
          </div>
          <button id="cr8-v3-close">×</button>
        </div>
        <div id="cr8-v3-log"></div>
        <div id="cr8-v3-actions"></div>
        <div id="cr8-v3-small">For urgent help, call ${CONFIG.phoneDisplay}.</div>
        <div id="cr8-v3-input-row">
          <input id="cr8-v3-input" type="text" placeholder="Type your message..." />
          <button id="cr8-v3-send">Send</button>
        </div>
      </div>
      `
    );
  }

  function quickActions(items) {
    const wrap = document.getElementById("cr8-v3-actions");
    if (!wrap) return;
    wrap.innerHTML = "";
    items.forEach((text) => {
      const btn = document.createElement("button");
      btn.className = "cr8-v3-chip";
      btn.type = "button";
      btn.textContent = text;
      btn.addEventListener("click", () => {
        addMessage(text, "user");
        handleMessage(text);
      });
      wrap.appendChild(btn);
    });
  }

  function defaultActions() {
    return state.lang === "es"
      ? ["Pedir cita", "Estimado", "Horario", "Ubicación", "Seguro", "English"]
      : ["Book appointment", "Get estimate", "Hours", "Location", "Insurance", "Español"];
  }

  function repairActions() {
    return state.lang === "es"
      ? ["Pedir cita", "Estimado", "Llamar", "Fotos", "Pagar de bolsillo"]
      : ["Book appointment", "Get estimate", "Call shop", "Photos", "Out of pocket"];
  }

  function addMessage(text, type) {
    state.chatHistory.push({ type, text, time: new Date().toISOString() });

    const log = document.getElementById("cr8-v3-log");
    const div = document.createElement("div");
    div.className =
      "cr8-v3-msg " + (type === "user" ? "cr8-v3-user" : "cr8-v3-bot");
    div.textContent = text;
    log.appendChild(div);
    log.scrollTop = log.scrollHeight;
  }

  function bot(text) {
    setTimeout(() => addMessage(text, "bot"), 180);
  }

  function normalize(str) {
    return String(str || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^\w\s$.-]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function levenshtein(a, b) {
    a = normalize(a);
    b = normalize(b);
    if (!a || !b) return 99;
    if (Math.abs(a.length - b.length) > 3) return 99;

    const dp = Array.from({ length: a.length + 1 }, () => []);
    for (let i = 0; i <= a.length; i++) dp[i][0] = i;
    for (let j = 0; j <= b.length; j++) dp[0][j] = j;

    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        dp[i][j] =
          a[i - 1] === b[j - 1]
            ? dp[i - 1][j - 1]
            : Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]) + 1;
      }
    }
    return dp[a.length][b.length];
  }

  function scoreIntent(message, phrases) {
    const msg = normalize(message);
    const words = msg.split(" ").filter(Boolean);
    let score = 0;

    for (const phrase of phrases) {
      const p = normalize(phrase);
      if (!p) continue;

      if (msg === p) score += 18;
      else if (msg.includes(p)) score += p.length > 8 ? 9 : 5;

      const pWords = p.split(" ").filter(Boolean);

      if (pWords.length === 1) {
        for (const w of words) {
          if (pWords[0].length >= 5 && levenshtein(w, pWords[0]) <= 1) {
            score += 3;
          }
        }
      } else {
        const matches = pWords.filter((pw) => msg.includes(pw)).length;
        if (matches >= Math.ceil(pWords.length * 0.75)) score += 4;
      }
    }

    return score;
  }

  function detectIntent(message) {
    const scores = Object.entries(INTENTS)
      .map(([intent, phrases]) => ({ intent, score: scoreIntent(message, phrases) }))
      .sort((a, b) => b.score - a.score);

    return scores[0] && scores[0].score > 0 ? scores[0].intent : "unknown";
  }

  function detectLanguage(message) {
    const msg = normalize(message);

    const spanishWords = [
      "hola", "gracias", "cuanto", "cita", "necesito", "carro", "troca",
      "seguro", "defensa", "frenos", "pintura", "donde", "horario",
      "espanol", "hablan", "precio", "estimado", "mecanico", "chocado",
      "rayon", "oxido", "llanta", "llave", "vidrio", "parabrisas"
    ];

    const englishWords = [
      "hello", "thanks", "how much", "appointment", "car", "insurance",
      "bumper", "brakes", "paint", "where", "hours", "estimate",
      "tire", "key", "glass", "rust", "diagnostic"
    ];

    const esScore = spanishWords.filter((w) => msg.includes(w)).length;
    const enScore = englishWords.filter((w) => msg.includes(w)).length;

    if (esScore > enScore) return "es";
    if (enScore > esScore) return "en";
    return state.lang;
  }

  function reply(intent) {
    return (
      (REPLIES[state.lang] && REPLIES[state.lang][intent]) ||
      REPLIES[state.lang].fallback
    );
  }

  function wantsYes(message) {
    const msg = normalize(message);
    return [
      "yes", "yeah", "yep", "ok", "okay", "sure", "please", "sounds good",
      "si", "claro", "dale", "bueno", "esta bien", "está bien"
    ].some((x) => msg.includes(normalize(x)));
  }

  function wantsCancel(message) {
    const msg = normalize(message);
    return [
      "cancel", "stop", "never mind", "nevermind", "cancelar", "no quiero",
      "dejalo", "déjalo"
    ].some((x) => msg.includes(normalize(x)));
  }

  function startBooking(prefillService) {
    state.booking = freshBooking();
    if (prefillService) state.booking.service = readableService(prefillService);
    state.step = "booking_name";
    bot(reply("bookingStart"));
    quickActions(state.lang === "es" ? ["Cancelar", "Horario", "Llamar"] : ["Cancel", "Hours", "Call shop"]);
  }

  function startLeadCapture(prefillNeed) {
    state.lead = freshLead();
    state.lead.language = state.lang;
    if (prefillNeed) state.lead.need = readableService(prefillNeed);
    state.step = "lead_name";
    bot(reply("leadAsk"));
    quickActions(state.lang === "es" ? ["Cancelar", "Pedir cita"] : ["Cancel", "Book appointment"]);
  }

  function resetFlow() {
    state.step = null;
    state.booking = freshBooking();
    state.lead = freshLead();
    quickActions(defaultActions());
  }

  function readableService(intent) {
    const map = {
      collision: "Collision / auto body repair",
      bumper: "Bumper repair",
      paint: "Paint / refinishing",
      rust: "Rust repair / welding",
      brakes: "Brake service",
      diagnostic: "Diagnostic / check engine",
      suspension: "Suspension / steering",
      exhaust: "Exhaust repair",
      tires: "Tire service",
      glass: "Glass / mirror repair",
      key: "Key fob programming",
      inspection: "Inspection / emissions prep",
      towing: "Vehicle not drivable / towing question",
      insurance: "Insurance repair",
      outOfPocket: "Out-of-pocket repair"
    };
    return map[intent] || intent || "";
  }

  function parseFlexibleDate(input) {
    const msg = normalize(input);
    const today = new Date();
    today.setHours(12, 0, 0, 0);

    if (/^\d{4}-\d{2}-\d{2}$/.test(msg)) {
      const d = new Date(msg + "T12:00:00");
      return isNaN(d.getTime()) ? null : d;
    }

    if (msg.includes("tomorrow") || msg.includes("manana")) {
      const d = new Date(today);
      d.setDate(d.getDate() + 1);
      return d;
    }

    if (msg.includes("today") || msg.includes("hoy")) {
      return today;
    }

    const weekdays = {
      sunday: 0, domingo: 0,
      monday: 1, lunes: 1,
      tuesday: 2, martes: 2,
      wednesday: 3, miercoles: 3,
      thursday: 4, jueves: 4,
      friday: 5, viernes: 5,
      saturday: 6, sabado: 6
    };

    for (const [word, targetDay] of Object.entries(weekdays)) {
      if (msg.includes(word)) {
        const d = new Date(today);
        let diff = targetDay - d.getDay();
        if (diff <= 0 || msg.includes("next") || msg.includes("proximo")) diff += 7;
        d.setDate(d.getDate() + diff);
        return d;
      }
    }

    return null;
  }

  function formatDateYYYYMMDD(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  function isWeekday(date) {
    const day = date.getDay();
    return day >= 1 && day <= 5;
  }

  function parseTimeMinutes(input) {
    const msg = normalize(input);
    const match = msg.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/);
    if (!match) return null;

    let hour = parseInt(match[1], 10);
    const minute = match[2] ? parseInt(match[2], 10) : 0;
    const ampm = match[3];

    if (ampm === "pm" && hour !== 12) hour += 12;
    if (ampm === "am" && hour === 12) hour = 0;
    if (!ampm && hour >= 1 && hour <= 7) hour += 12;

    return hour * 60 + minute;
  }

  function isBusinessTime(input) {
    const mins = parseTimeMinutes(input);
    if (mins === null) return false;

    const open = CONFIG.openHour * 60 + CONFIG.openMinute;
    const close = CONFIG.closeHour * 60 + CONFIG.closeMinute;

    return mins >= open && mins <= close;
  }

  function summarizeConversation() {
    return state.chatHistory
      .slice(-20)
      .map((m) => `${m.type.toUpperCase()}: ${m.text}`)
      .join("\n");
  }

  async function handleBookingStep(message) {
    const r = REPLIES[state.lang];

    if (wantsCancel(message)) {
      resetFlow();
      bot(state.lang === "es" ? "Listo, cancelé la solicitud de cita." : "No problem, I canceled the appointment request.");
      return;
    }

    if (state.step === "booking_name") {
      state.booking.name = message.trim();
      state.step = "booking_phone";
      bot(r.askPhone);
      return;
    }

    if (state.step === "booking_phone") {
      state.booking.phone = message.trim();
      state.step = "booking_vehicle";
      bot(r.askVehicle);
      return;
    }

    if (state.step === "booking_vehicle") {
      state.booking.vehicle = message.trim();
      state.step = state.booking.service ? "booking_date" : "booking_service";
      bot(state.booking.service ? r.askDate : r.askService);
      return;
    }

    if (state.step === "booking_service") {
      state.booking.service = message.trim();
      state.step = "booking_date";
      bot(r.askDate);
      return;
    }

    if (state.step === "booking_date") {
      const parsed = parseFlexibleDate(message);
      if (!parsed) {
        bot(r.invalidDate);
        return;
      }

      if (!isWeekday(parsed)) {
        bot(r.weekend);
        return;
      }

      state.booking.appointment_date = formatDateYYYYMMDD(parsed);
      state.step = "booking_time";
      bot(r.askTime);
      return;
    }

    if (state.step === "booking_time") {
      if (!isBusinessTime(message)) {
        bot(r.invalidTime);
        return;
      }

      state.booking.appointment_time = message.trim();
      state.step = "booking_notes";
      bot(r.askNotes);
      return;
    }

    if (state.step === "booking_notes") {
      state.booking.notes = message.trim();
      state.booking.conversation_summary = summarizeConversation();

      const ok = await submitBooking();

      if (ok) bot(r.success);
      else bot(r.error);

      resetFlow();
    }
  }

  async function handleLeadStep(message) {
    if (wantsCancel(message)) {
      resetFlow();
      bot(state.lang === "es" ? "Listo, cancelé eso." : "No problem, I canceled that.");
      return;
    }

    if (state.step === "lead_name") {
      state.lead.name = message.trim();
      state.step = "lead_phone";
      bot(reply("leadPhone"));
      return;
    }

    if (state.step === "lead_phone") {
      state.lead.phone = message.trim();
      state.step = "lead_vehicle";
      bot(reply("leadVehicle"));
      return;
    }

    if (state.step === "lead_vehicle") {
      state.lead.vehicle = message.trim();
      state.step = state.lead.need ? null : "lead_need";

      if (state.lead.need) {
        const ok = await submitLead();
        bot(ok ? reply("success") : reply("error"));
        resetFlow();
      } else {
        bot(reply("leadNeed"));
      }
      return;
    }

    if (state.step === "lead_need") {
      state.lead.need = message.trim();
      const ok = await submitLead();
      bot(ok ? reply("success") : reply("error"));
      resetFlow();
    }
  }

  async function submitBooking() {
    const url = CONFIG.SUPABASE_URL;
    const key = CONFIG.SUPABASE_ANON_KEY;

    if (!url || !key || url.includes("YOUR_") || key.includes("YOUR_")) {
      console.warn("Missing Supabase credentials.");
      return false;
    }

    const payload = {
      name: state.booking.name,
      phone: state.booking.phone,
      email: state.booking.email || "",
      vehicle: state.booking.vehicle,
      service: state.booking.service,
      appointment_date: state.booking.appointment_date,
      appointment_time: state.booking.appointment_time,
      notes:
        `${state.booking.notes}\n\n` +
        `Source: ${CONFIG.source}\n` +
        `Vehicle: ${state.booking.vehicle}\n\n` +
        `Conversation:\n${state.booking.conversation_summary}`,
      status: "new",
      created_source: CONFIG.source
    };

    try {
      const res = await fetch(`${url}/rest/v1/${CONFIG.bookingsTable}`, {
        method: "POST",
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal"
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        console.error("Supabase booking insert failed:", await res.text());
        return false;
      }

      return true;
    } catch (err) {
      console.error("Booking error:", err);
      return false;
    }
  }

  async function submitLead() {
    const url = CONFIG.SUPABASE_URL;
    const key = CONFIG.SUPABASE_ANON_KEY;

    if (!url || !key || url.includes("YOUR_") || key.includes("YOUR_")) {
      console.warn("Missing Supabase credentials.");
      return false;
    }

    const payload = {
      name: state.lead.name,
      phone: state.lead.phone,
      vehicle: state.lead.vehicle,
      service: state.lead.need,
      notes:
        `Lead captured by ${CONFIG.source}\n\nConversation:\n${summarizeConversation()}`,
      status: "new",
      created_source: CONFIG.source
    };

    try {
      const res = await fetch(`${url}/rest/v1/${CONFIG.bookingsTable}`, {
        method: "POST",
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal"
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        console.error("Supabase lead insert failed:", await res.text());
        return false;
      }

      return true;
    } catch (err) {
      console.error("Lead submit error:", err);
      return false;
    }
  }

  async function logUnknown(message) {
    const url = CONFIG.SUPABASE_URL;
    const key = CONFIG.SUPABASE_ANON_KEY;

    if (!url || !key || url.includes("YOUR_") || key.includes("YOUR_")) return;

    try {
      await fetch(`${url}/rest/v1/${CONFIG.unknownTable}`, {
        method: "POST",
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal"
        },
        body: JSON.stringify({
          message,
          language: state.lang,
          source: CONFIG.source,
          conversation: summarizeConversation()
        })
      });
    } catch (err) {
      console.warn("Unknown message logging skipped:", err);
    }
  }

  function handleIntent(intent, message) {
    state.lastIntent = intent;

    const repairRelated = [
      "collision", "bumper", "paint", "rust", "brakes", "diagnostic",
      "suspension", "exhaust", "tires", "glass", "key", "inspection",
      "towing", "insurance", "outOfPocket"
    ];

    if (repairRelated.includes(intent)) {
      state.lastRepairIntent = intent;
    }

    if (intent === "spanish") {
      state.lang = "es";
      bot(REPLIES.es.greeting);
      quickActions(defaultActions());
      return;
    }

    if (intent === "english") {
      state.lang = "en";
      bot(REPLIES.en.greeting);
      quickActions(defaultActions());
      return;
    }

    if (intent === "greeting") {
      bot(REPLIES[state.lang].greeting);
      quickActions(defaultActions());
      return;
    }

    if (intent === "thanks") {
      bot(reply("thanks"));
      quickActions(defaultActions());
      return;
    }

    if (intent === "booking") {
      startBooking(state.lastRepairIntent);
      return;
    }

    if (intent === "phone") {
      bot(reply("phone"));
      quickActions(defaultActions());
      return;
    }

    if (intent === "estimate") {
      bot(reply("estimate"));
      quickActions(repairActions());
      return;
    }

    if (intent === "unknown") {
      bot(reply("fallback"));
      logUnknown(message);
      quickActions(repairActions());
      return;
    }

    bot(reply(intent));

    if (repairRelated.includes(intent) || ["photos", "timeline", "payment", "warranty"].includes(intent)) {
      quickActions(repairActions());
    } else {
      quickActions(defaultActions());
    }
  }

  function handleMessage(message) {
    const text = message.trim();
    if (!text) return;

    state.lang = detectLanguage(text);

    if (state.step && state.step.startsWith("booking_")) {
      handleBookingStep(text);
      return;
    }

    if (state.step && state.step.startsWith("lead_")) {
      handleLeadStep(text);
      return;
    }

    const norm = normalize(text);

    if (norm === "book appointment" || norm === "pedir cita") {
      startBooking(state.lastRepairIntent);
      return;
    }

    if (norm === "get estimate" || norm === "estimado") {
      handleIntent("estimate", text);
      return;
    }

    if (norm === "call shop" || norm === "llamar") {
      bot(reply("phone"));
      return;
    }

    if (norm === "hours" || norm === "horario") {
      handleIntent("hours", text);
      return;
    }

    if (norm === "location" || norm === "ubicacion") {
      handleIntent("location", text);
      return;
    }

    if (norm === "photos" || norm === "fotos") {
      handleIntent("photos", text);
      return;
    }

    if (norm === "out of pocket" || norm === "pagar de bolsillo") {
      handleIntent("outOfPocket", text);
      return;
    }

    if (wantsYes(text) && ["estimate", "collision", "bumper", "paint", "rust", "diagnostic", "brakes", "insurance", "outOfPocket"].includes(state.lastIntent)) {
      startBooking(state.lastRepairIntent || state.lastIntent);
      return;
    }

    const intent = detectIntent(text);
    handleIntent(intent, text);
  }

  function bindEvents() {
    const button = document.getElementById("cr8-v3-button");
    const panel = document.getElementById("cr8-v3-panel");
    const close = document.getElementById("cr8-v3-close");
    const badge = document.getElementById("cr8-v3-badge");
    const input = document.getElementById("cr8-v3-input");
    const send = document.getElementById("cr8-v3-send");

    function toggle(force) {
      state.open = typeof force === "boolean" ? force : !state.open;
      panel.style.display = state.open ? "flex" : "none";
      badge.style.display = state.open ? "none" : "inline-block";
      if (state.open) setTimeout(() => input.focus(), 50);
    }

    button.addEventListener("click", () => toggle());
    close.addEventListener("click", () => toggle(false));

    send.addEventListener("click", () => {
      const value = input.value.trim();
      if (!value) return;
      addMessage(value, "user");
      input.value = "";
      handleMessage(value);
    });

    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") send.click();
    });
  }

  function init() {
    injectStyles();
    renderWidget();
    bindEvents();
    quickActions(defaultActions());

    setTimeout(() => {
      addMessage(REPLIES.en.greeting, "bot");
    }, 350);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();