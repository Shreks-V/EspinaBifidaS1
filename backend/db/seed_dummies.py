"""
Dummy data loader — base de datos EBIF
Inserta ~15 pacientes, 5 doctores, 10 productos, citas, ventas y comodatos.
Idempotente: verifica existencia antes de insertar.

Uso:
    cd backend
    venv/bin/python3 db/seed_dummies.py
"""
import sys
import oracledb
from datetime import date, datetime, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from app.infrastructure.persistence.oracle import init_pool, get_db  # noqa: E402

# ─── Helpers ──────────────────────────────────────────────────────────────────

def run(cur, label, stmt, params=None):
    try:
        cur.execute(stmt, params or [])
        return True
    except oracledb.DatabaseError as e:
        msg = str(e)
        if 'ORA-00001' in msg:          # unique constraint
            return False
        if 'ORA-02292' in msg:          # FK violation
            print(f"  [FK] {label}: {msg.splitlines()[0]}")
            return False
        print(f"  [ERR] {label}: {msg.splitlines()[0]}")
        return False

def callproc(cur, sp, params):
    try:
        cur.callproc(sp, params)
        return True
    except oracledb.DatabaseError as e:
        print(f"  [ERR] {sp}: {str(e).splitlines()[0]}")
        return False

def exists(cur, table, col, val):
    cur.execute(f"SELECT COUNT(*) FROM {table} WHERE {col} = :v", {'v': val})
    return cur.fetchone()[0] > 0

# ─── Data ─────────────────────────────────────────────────────────────────────

ADMIN_ID = 4   # ID del usuario ADMINISTRADOR creado en seed

DOCTORES = [
    ("Carlos",   "Mendoza",   "López",    "Neurología Pediátrica",      "8141112233", "carlos.mendoza@ebif.mx"),
    ("Ana",      "Ruiz",      "Torres",   "Fisiatría y Rehabilitación",  "8142223344", "ana.ruiz@ebif.mx"),
    ("Roberto",  "García",    "Sánchez",  "Ortopedia Pediátrica",        "8143334455", "roberto.garcia@ebif.mx"),
    ("Laura",    "Martínez",  "Vega",     "Terapia Ocupacional",         "8144445566", "laura.martinez@ebif.mx"),
    ("Miguel",   "Torres",    "Díaz",     "Urología Pediátrica",         "8145556677", "miguel.torres@ebif.mx"),
]

PRODUCTOS = [
    # (clave, nombre, desc, tipo, precio_a, precio_b, serie, marca, modelo)
    ("EQ-001", "Silla de Ruedas Manual",   "Silla ligera plegable acero",   "EQUIPO_MEDICO", 1500, 2000, "SRM-0001", "Karma",     "KM-2500"),
    ("EQ-002", "Andadera con Ruedas",      "Andadera aluminio 4 ruedas",    "EQUIPO_MEDICO", 800,  1200, "AND-0002", "Drive Med", "DM-2000"),
    ("EQ-003", "Muletas Axilares",         "Par de muletas aluminio",       "EQUIPO_MEDICO", 350,  500,  "MUL-0003", "Invacare",  "IRC-9305"),
    ("EQ-004", "Órtesis Tobillo-Pie",      "AFO polipropileno derecha",     "EQUIPO_MEDICO", 1200, 1800, "ORT-0004", "Ossur",     "AFO-D24"),
    ("EQ-005", "Cojín Antiescaras",        "Cojín gel viscoelástico",       "EQUIPO_MEDICO", 600,  900,  "COJ-0005", "Roho",      "R2-L"),
    ("MED-001","Catéter Urinario 14Fr",    "Catéter hidrofílico desechable","MEDICAMENTO",   25,   40,   None, None, None),
    ("MED-002","Pañales Talla M",          "Pack 30 piezas",                "MEDICAMENTO",   120,  180,  None, None, None),
    ("MED-003","Guantes Látex S/M",        "Caja 100 guantes sin polvo",    "MEDICAMENTO",   80,   120,  None, None, None),
    ("MED-004","Cinta Micropore 2.5cm",    "Cinta médica respirante",       "MEDICAMENTO",   15,   25,   None, None, None),
    ("MED-005","Gel Antibacterial 1L",     "Gel con 70% alcohol",           "MEDICAMENTO",   45,   70,   None, None, None),
]

# CURPs válidos (18 chars, formato oficial)
PACIENTES = [
    ("BEN-000001","GARCÍA",   "LÓPEZ",    "JUAN CARLOS", "H","1998-05-14",
     "GALJ980514HNLRPN09","Martina López","Calle Roble 12","Centro","Monterrey","Nuevo León","64000",
     "8181234567","8181234568","jc.garcia@gmail.com","Martina López","8181234567",
     "Monterrey","Nuevo León","Hospital Universitario","O+","N","Tiene derivación VP","CUOTA A"),
    ("BEN-000002","HERNÁNDEZ","MARTÍNEZ",  "SOFÍA",       "M","2005-11-22",
     "HEMS051122MNLRRF01","Pedro Hernández","Av. Constitución 45","Obrera","Monterrey","Nuevo León","64010",
     "8182345678","8182345679","sofia.h@hotmail.com","Pedro Hernández","8182345678",
     "Monterrey","Nuevo León","Hospital Metropolitano","A+","S","Hipersensibilidad látex","CUOTA B"),
    ("BEN-000003","LÓPEZ",    "RAMÍREZ",   "DIEGO ALBERTO","H","2001-03-08",
     "LORD010308HNLPMG00","Rosa Ramírez","Paseo del Nogal 7","Cumbres","Monterrey","Nuevo León","64610",
     "8183456789","8183456780","diego.lr@yahoo.com","Rosa Ramírez","8183456789",
     "San Pedro","Nuevo León","Hospital San José","B+","N","Mielomeningocele L4-L5","CUOTA A"),
    ("BEN-000004","TORRES",   "SÁNCHEZ",   "VALERIA",     "M","2010-07-30",
     "TOSV100730MNLRLN06","Ernesto Torres","Calle Cedro 33","Del Valle","San Pedro","Nuevo León","66220",
     "8184567890","8184567891","valeria.ts@gmail.com","Ernesto Torres","8184567890",
     "San Pedro","Nuevo León","Hospital San José","AB+","N","Usa AFO bilateral","CUOTA B"),
    ("BEN-000005","REYES",    "FLORES",    "MIGUEL ÁNGEL","H","2015-01-19",
     "REFM150119HNLYLN05","Carmen Flores","Blvd. Díaz Ordaz 88","Linda Vista","Guadalupe","Nuevo León","67140",
     "8185678901","8185678902","miguel.rf@live.com","Carmen Flores","8185678901",
     "Guadalupe","Nuevo León","Hospital de la Mujer","A-","S","Meningocele dorsal","CUOTA A"),
    ("BEN-000006","MORALES",  "JIMÉNEZ",   "ANDREA",      "M","2008-09-05",
     "MOJA080905MNLRND02","Luis Morales","Calle Pino 15","Mitras","Monterrey","Nuevo León","64460",
     "8186789012","8186789013","andrea.mj@gmail.com","Luis Morales","8186789012",
     "Monterrey","Nuevo León","IMSS Clínica 25","O-","N","Terapia física 3x/semana","CUOTA B"),
    ("BEN-000007","RAMÍREZ",  "GUTIÉRREZ", "CARLOS",      "H","1995-12-25",
     "RAGC951225HNLMTR08","Ana Gutiérrez","Av. Morones Prieto 200","Roma","Monterrey","Nuevo León","64700",
     "8187890123","8187890124","carlos.rg@outlook.com","Ana Gutiérrez","8187890123",
     "Monterrey","Nuevo León","Hospital Christus","A+","N","Espina bífida oculta, asintomático","CUOTA A"),
    ("BEN-000008","VÁZQUEZ",  "LUNA",      "ISABELLA",    "M","2018-06-11",
     "VALI180611MNLZNS04","Ricardo Vázquez","Río Bravo 56","Río","Monterrey","Nuevo León","64890",
     "8188901234","8188901235","isabella.vl@gmail.com","Ricardo Vázquez","8188901234",
     "Apodaca","Nuevo León","Hospital Ángeles","B-","S","Lipomeningocele, cirugía 2019","CUOTA B"),
    ("BEN-000009","GÓMEZ",    "RAMOS",     "FERNANDA",    "M","2003-04-17",
     "GORF030417MNLMRS00","Martha Ramos","Calle Aguacate 9","Bosques","Apodaca","Nuevo León","66600",
     "8189012345","8189012346","fernanda.gr@gmail.com","Martha Ramos","8189012345",
     "Apodaca","Nuevo León","IMSS Clínica 67","O+","N","Seguimiento ortopédico anual","CUOTA B"),
    ("BEN-000010","DÍAZ",     "CASTILLO",  "RODRIGO",     "H","2012-08-03",
     "DICR120803HNLZSR07","Patricia Castillo","Av. Lincoln 340","Tecnológico","Monterrey","Nuevo León","64700",
     "8180123456","8180123457","rodrigo.dc@gmail.com","Patricia Castillo","8180123456",
     "Monterrey","Nuevo León","Tec de Monterrey Hospital","AB-","N","Usa silla de ruedas","CUOTA A"),
    ("BEN-000011","CERVANTES","ORTEGA",    "CAMILA",      "M","2007-02-28",
     "CEOC070228MNLRRL03","Jorge Cervantes","Calle Olmo 77","Jardines","Santa Catarina","Nuevo León","66350",
     "8181234560","8181234561","camila.co@hotmail.com","Jorge Cervantes","8181234560",
     "Santa Catarina","Nuevo León","Hospital General","A+","S","Cateterismo intermitente","CUOTA B"),
    ("BEN-000012","JIMÉNEZ",  "VEGA",      "EMILIO",      "H","2000-10-14",
     "JIVE001014HNLMGL09","Lucia Vega","Prol. Hidalgo 123","Independencia","Monterrey","Nuevo León","64290",
     "8182345670","8182345671","emilio.jv@gmail.com","Lucia Vega","8182345670",
     "Monterrey","Nuevo León","Hospital Naval","B+","N","Mielomeningocele L2-L3","CUOTA B"),
    ("BEN-000013","AGUILAR",  "SALINAS",   "NATALIA",     "M","2013-05-20",
     "AGSN130520MNLGLT05","Fernando Aguilar","Insurgentes 456","Centro","Monterrey","Nuevo León","64000",
     "8183456780","8183456781","natalia.as@yahoo.com","Fernando Aguilar","8183456780",
     "Monterrey","Nuevo León","Hospital Universitario","O+","N","Terapia ocupacional 2x/semana","CUOTA A"),
    ("BEN-000014","MENDOZA",  "HERRERA",   "PABLO",       "H","2016-03-07",
     "MEHP160307HNLNRB06","Claudia Herrera","Av. Revolución 789","Contry","Monterrey","Nuevo León","64830",
     "8184567891","8184567892","pablo.mh@gmail.com","Claudia Herrera","8184567891",
     "Monterrey","Nuevo León","Hospital de Pediatría","A+","S","Hidrocefalia tratada","CUOTA B"),
    ("BEN-000015","FLORES",   "MEDINA",    "ELENA",       "M","1990-07-22",
     "FOME900722MNLLDL08","Roberto Medina","Calle Fresno 34","Las Brisas","Monterrey","Nuevo León","64850",
     "8185678902","8185678903","elena.fm@live.com","Roberto Medina","8185678902",
     "Monterrey","Nuevo León","Hospital San José","A-","N","Espina bífida oculta sacra","CUOTA A"),
]

# Tipo espina por paciente (índice base-0 → ID en BD)
TIPOS_ESPINA_PAC = [
    [1],        # Juan Carlos  - Mielomeningocele
    [1, 2],     # Sofía        - Mielomeningocele + Meningocele
    [1],        # Diego        - Mielomeningocele
    [3],        # Valeria      - Oculta
    [2],        # Miguel       - Meningocele
    [1],        # Andrea       - Mielomeningocele
    [3],        # Carlos       - Oculta
    [4],        # Isabella     - Lipomeningocele
    [1],        # Fernanda     - Mielomeningocele
    [1],        # Rodrigo      - Mielomeningocele
    [2],        # Camila       - Meningocele
    [1],        # Emilio       - Mielomeningocele
    [1],        # Natalia      - Mielomeningocele
    [3, 4],     # Pablo        - Oculta + Lipomeningocele
    [3],        # Elena        - Oculta
]


def seed_all():
    init_pool()
    with get_db() as conn:
        cur = conn.cursor()

        # ── 1. DOCTORES ──────────────────────────────────────────────────────
        print("\n=== 1. DOCTORES ===")
        doctor_ids = []
        for nombre, ap, am, esp, tel, correo in DOCTORES:
            if exists(cur, "DOCTOR", "CORREO", correo):
                cur.execute("SELECT ID_DOCTOR FROM DOCTOR WHERE CORREO=:c", {'c': correo})
                doctor_ids.append(cur.fetchone()[0])
                print(f"  -- Dr(a). {ap} ya existe")
                continue
            cur.execute("""INSERT INTO DOCTOR
                (NOMBRE, APELLIDO_PATERNO, APELLIDO_MATERNO, ESPECIALIDAD,
                 TELEFONO, CORREO, ID_USUARIO_REGISTRO)
                VALUES (:1,:2,:3,:4,:5,:6,:7)""",
                [nombre, ap, am, esp, tel, correo, ADMIN_ID])
            cur.execute("SELECT ID_DOCTOR FROM DOCTOR WHERE CORREO=:c", {'c': correo})
            did = cur.fetchone()[0]
            doctor_ids.append(did)
            print(f"  OK Dr(a). {ap} (ID={did})")
        conn.commit()

        # ── 2. PRODUCTOS + EXISTENCIA ─────────────────────────────────────────
        print("\n=== 2. PRODUCTOS ===")
        producto_ids = []
        for clave, nombre, desc, tipo, pa, pb, serie, marca, modelo in PRODUCTOS:
            if exists(cur, "PRODUCTO", "CLAVE_INTERNA", clave):
                cur.execute("SELECT ID_PRODUCTO FROM PRODUCTO WHERE CLAVE_INTERNA=:c", {'c': clave})
                producto_ids.append(cur.fetchone()[0])
                print(f"  -- {nombre} ya existe")
                continue
            id_out = cur.var(int)
            cur.callproc("SP_CREAR_PRODUCTO_CON_EXISTENCIA", [
                clave, nombre, desc, tipo, pa, pb, ADMIN_ID,
                5, "pieza",
                None, None, 'S',  # med params
                serie, marca, modelo, None,  # eq params
                id_out,
            ])
            pid = id_out.getvalue()
            producto_ids.append(pid)
            print(f"  OK {nombre} (ID={pid})")
            # Agregar stock inicial
            cur.callproc("SP_REGISTRAR_MOVIMIENTO_STOCK",
                [pid, 'ENTRADA', 20, ADMIN_ID, None, None, 'Stock inicial dummies'])
        conn.commit()

        # ── 3. PACIENTES ──────────────────────────────────────────────────────
        print("\n=== 3. PACIENTES ===")
        paciente_ids = []
        for i, p in enumerate(PACIENTES):
            folio = p[0]
            ap_pat = p[1]; ap_mat = p[2]; nombre = p[3]
            genero = p[4]
            fnac = datetime.strptime(p[5], "%Y-%m-%d").date()
            curp = p[6]
            if exists(cur, "PACIENTE", "FOLIO", folio):
                cur.execute("SELECT ID_PACIENTE FROM PACIENTE WHERE FOLIO=:f", {'f': folio})
                paciente_ids.append(cur.fetchone()[0])
                print(f"  -- {folio} ya existe")
                continue
            num_list_type = conn.gettype("SYS.ODCINUMBERLIST")
            tipos_espina = num_list_type.newobject()
            for t in TIPOS_ESPINA_PAC[i]:
                tipos_espina.append(t)
            id_out = cur.var(int)
            cur.callproc("SP_REGISTRAR_PACIENTE_COMPLETO", [
                folio, nombre, ap_pat, ap_mat, curp, genero, fnac,
                p[7],   # nombre_padre_madre
                p[8],   # direccion
                p[9],   # colonia
                p[10],  # ciudad
                p[11],  # estado
                p[12],  # cp
                p[13],  # tel casa
                p[14],  # tel cel
                p[15],  # correo
                p[16],  # emergencia avisar a
                p[17],  # tel emergencia
                p[18],  # municipio_nac
                p[19],  # estado_nac
                p[20],  # hospital_nac
                p[21],  # tipo_sangre
                p[22],  # usa_valvula
                p[23],  # notas
                date.today() - timedelta(days=180),  # fecha_alta
                p[24],  # tipo_cuota
                'APROBADO',
                ADMIN_ID,
                tipos_espina,
                id_out,
            ])
            pid = id_out.getvalue()
            paciente_ids.append(pid)
            # Actualizar folio a BEN-XXXXXX
            cur.execute("UPDATE PACIENTE SET FOLIO=:f WHERE ID_PACIENTE=:p",
                        {'f': folio, 'p': pid})
            print(f"  OK {folio} — {nombre} {ap_pat} (ID={pid})")
        conn.commit()

        # ── 4. DOCTOR_SERVICIO ────────────────────────────────────────────────
        print("\n=== 4. DOCTOR_SERVICIO ===")
        # servicios_ids: 1=Consulta, 2=T.Física, 3=T.Ocupacional, 4=Psicología, 5=Neurológica, 6=T.Social
        asignaciones = {
            0: [1, 5],        # Mendoza → Consulta, Neurológica
            1: [1, 2, 3],     # Ruiz → Consulta, T.Física, T.Ocupacional
            2: [1, 2],        # García → Consulta, T.Física
            3: [3, 4, 6],     # Martínez → T.Ocupacional, Psicología, T.Social
            4: [1, 5],        # Torres → Consulta, Neurológica
        }
        for idx, svc_ids in asignaciones.items():
            did = doctor_ids[idx]
            num_list_type = conn.gettype("SYS.ODCINUMBERLIST")
            svc_list = num_list_type.newobject()
            for s in svc_ids:
                svc_list.append(s)
            callproc(cur, "SP_ASIGNAR_SERVICIOS_DOCTOR", [did, svc_list])
            print(f"  OK Doctor ID={did} → servicios {svc_ids}")
        conn.commit()

        # ── 5. DISPONIBILIDAD_DOCTOR ──────────────────────────────────────────
        print("\n=== 5. DISPONIBILIDAD_DOCTOR ===")
        today = date.today()
        for did in doctor_ids:
            for offset in range(0, 28, 7):   # 4 semanas
                slot_date = today + timedelta(days=offset)
                h_inicio = datetime.combine(slot_date, datetime.min.time()).replace(hour=9)
                h_fin    = datetime.combine(slot_date, datetime.min.time()).replace(hour=13)
                run(cur, f"Disponibilidad Dr {did}",
                    """INSERT INTO DISPONIBILIDAD_DOCTOR
                    (ID_DOCTOR, FECHA, HORA_INICIO, HORA_FIN, DISPONIBLE, DIA_SEMANA)
                    VALUES (:1,:2,:3,:4,'S',:5)""",
                    [did, slot_date, h_inicio, h_fin, slot_date.weekday()])
        conn.commit()
        print(f"  OK disponibilidad para {len(doctor_ids)} doctores × 4 semanas")

        # ── 6. CITAS ──────────────────────────────────────────────────────────
        print("\n=== 6. CITAS ===")
        cur.execute("SELECT COUNT(*) FROM CITA")
        citas_existentes = cur.fetchone()[0]
        citas_data = [
            # (pac_idx, doctor_idx, servicio_id, dias_offset, estatus_post)
            (0,  0, 1, -60, 'COMPLETADA'),
            (1,  1, 2, -45, 'COMPLETADA'),
            (2,  2, 1, -30, 'COMPLETADA'),
            (3,  3, 3, -20, 'COMPLETADA'),
            (4,  0, 5, -15, 'COMPLETADA'),
            (5,  1, 2, -10, 'COMPLETADA'),
            (6,  4, 1,  -7, 'COMPLETADA'),
            (7,  3, 4,  -5, 'COMPLETADA'),
            (8,  1, 2,  -3, 'COMPLETADA'),
            (9,  2, 1,  -2, 'CANCELADA'),
            (10, 0, 5,   1, 'PROGRAMADA'),
            (11, 1, 2,   2, 'PROGRAMADA'),
            (12, 3, 3,   3, 'PROGRAMADA'),
            (13, 4, 1,   5, 'PROGRAMADA'),
            (14, 0, 5,   7, 'PROGRAMADA'),
            (0,  1, 2,  10, 'PROGRAMADA'),
            (2,  2, 1,  14, 'PROGRAMADA'),
            (4,  3, 4,  -1, 'EN_CURSO'),
        ]
        cita_ids = []
        if citas_existentes >= len(citas_data):
            print(f"  -- {citas_existentes} citas ya existen, omitiendo")
            cur.execute("SELECT ID_CITA FROM CITA ORDER BY ID_CITA")
            cita_ids = [r[0] for r in cur.fetchall()]
        else:
            for pac_i, doc_i, svc_id, days, estatus in citas_data:
                if pac_i >= len(paciente_ids) or doc_i >= len(doctor_ids):
                    continue
                pac_id = paciente_ids[pac_i]
                doc_id = doctor_ids[doc_i]
                fh = datetime.now() + timedelta(days=days)
                fh = fh.replace(hour=10 + (days % 4), minute=0, second=0, microsecond=0)
                nlt = conn.gettype("SYS.ODCINUMBERLIST")
                def nl(*vals):
                    o = nlt.newobject(); [o.append(v) for v in vals]; return o
                id_out = cur.var(int)
                ok = callproc(cur, "SP_CREAR_CITA_CON_SERVICIOS", [
                    pac_id, ADMIN_ID, fh, f"Cita dummy {svc_id}",
                    nl(svc_id), nl(doc_id), nl(1), id_out,
                ])
                if ok:
                    cid = id_out.getvalue()
                    cita_ids.append(cid)
                    if estatus != 'PROGRAMADA':
                        cur.execute("UPDATE CITA SET ESTATUS=:e WHERE ID_CITA=:c",
                                    {'e': estatus, 'c': cid})
                    print(f"  OK Cita ID={cid} Pac={pac_id} Dr={doc_id} [{estatus}]")
            conn.commit()

        # ── 7. VENTAS ─────────────────────────────────────────────────────────
        print("\n=== 7. VENTAS ===")
        cur.execute("SELECT COUNT(*) FROM VENTA")
        ventas_existentes = cur.fetchone()[0]
        ventas_data = [
            (0, [("PRODUCTO", producto_ids[5], "Catéter 14Fr", 30, 2)], [(1, 60)]),   # EFECTIVO
            (1, [("PRODUCTO", producto_ids[6], "Pañales M",    130, 1)], [(2, 130)]),  # TARJETA
            (2, [("PRODUCTO", producto_ids[7], "Guantes S/M",  90,  1)], [(1, 90)]),   # EFECTIVO
            (3, [("PRODUCTO", producto_ids[8], "Micropore",    20,  3)], [(1, 60)]),   # EFECTIVO
            (4, [("PRODUCTO", producto_ids[9], "Gel antibact", 50,  1)], [(3, 50)]),   # TRANSFERENCIA
            (5, [("PRODUCTO", producto_ids[5], "Catéter 14Fr", 30,  4)], [(1, 120)]),  # EFECTIVO
            (6, [("SERVICIO", 1, "Consulta Médica",  0, 1)],             [(4, 0)]),    # EXENTO
            (7, [("SERVICIO", 2, "Terapia Física",   0, 1)],             [(4, 0)]),    # EXENTO
            (8, [("PRODUCTO", producto_ids[6], "Pañales M",  130, 2),
                 ("PRODUCTO", producto_ids[7], "Guantes",     90, 1)],   [(1,200),(2,150)]),
            (9, [("SERVICIO", 3, "T. Ocupacional",   0, 1)],             [(4, 0)]),    # EXENTO
        ]
        if ventas_existentes >= len(ventas_data):
            print(f"  -- {ventas_existentes} ventas ya existen, omitiendo")
        else:
            for pac_i, lineas, pagos in ventas_data:
                if pac_i >= len(paciente_ids):
                    continue
                pac_id = paciente_ids[pac_i]
                nlt = conn.gettype("SYS.ODCINUMBERLIST")
                vlt = conn.gettype("SYS.ODCIVARCHAR2LIST")
                def nl2(*vals):
                    o = nlt.newobject(); [o.append(v) for v in vals]; return o
                def vl2(*vals):
                    o = vlt.newobject(); [o.append(v) for v in vals]; return o
                tipos   = vl2(*[l[0] for l in lineas])
                ids     = nl2(*[l[1] for l in lineas])
                descs   = vl2(*[l[2] for l in lineas])
                precios = nl2(*[l[3] for l in lineas])
                cants   = nl2(*[l[4] for l in lineas])
                mets    = nl2(*[p[0] for p in pagos])
                montos  = nl2(*[p[1] for p in pagos])
                monto_total = sum(l[3] * l[4] for l in lineas)
                id_out  = cur.var(int)
                folio_out = cur.var(str)
                ok = callproc(cur, "SP_REGISTRAR_VENTA_COMPLETA", [
                    pac_id, ADMIN_ID, monto_total, 'N',
                    tipos, ids, descs, precios, cants,
                    mets, montos, id_out, folio_out,
                ])
                if ok:
                    print(f"  OK Venta {folio_out.getvalue()} Pac={pac_id} ${monto_total}")
        conn.commit()

        # ── 8. COMODATOS ──────────────────────────────────────────────────────
        print("\n=== 8. COMODATOS ===")
        comodatos = [
            (0, 0, "COM-000001", "PRESTADO",  0, "Silla para uso en casa"),
            (1, 1, "COM-000002", "PRESTADO",  0, "Andadera para rehabilitación"),
            (2, 2, "COM-000003", "DEVUELTO",  0, "Muletas temporales"),
            (3, 3, "COM-000004", "PRESTADO",  0, "Órtesis derecha"),
            (4, 4, "COM-000005", "PRESTADO",  0, "Cojín antiescaras"),
            (5, 0, "COM-000006", "DONADO",    0, "Donación permanente silla"),
        ]
        for pac_i, eq_i, folio_com, estatus, monto, nota in comodatos:
            if pac_i >= len(paciente_ids) or eq_i >= len(producto_ids):
                continue
            pac_id = paciente_ids[pac_i]
            eq_id  = producto_ids[eq_i]  # equipo médico — los primeros 5
            if exists(cur, "COMODATO", "FOLIO_COMODATO", folio_com):
                print(f"  -- {folio_com} ya existe")
                continue
            fdev = (date.today() - timedelta(days=30)) if estatus == 'DEVUELTO' else None
            run(cur, f"Comodato {folio_com}",
                """INSERT INTO COMODATO
                (FOLIO_COMODATO, ID_EQUIPO, ID_PACIENTE, ID_USUARIO_REGISTRO,
                 FECHA_PRESTAMO, FECHA_DEVOLUCION, ESTATUS,
                 MONTO_TOTAL, MONTO_PAGADO, SALDO_PENDIENTE, EXENTO_PAGO, NOTAS)
                VALUES (:1,:2,:3,:4,:5,:6,:7,:8,:9,:10,'S',:11)""",
                [folio_com, eq_id, pac_id, ADMIN_ID,
                 date.today() - timedelta(days=60), fdev, estatus,
                 monto, monto, 0, nota])
            # Stock: salida por comodato
            if estatus != 'DONADO':
                cur.execute("SELECT ID_COMODATO FROM COMODATO WHERE FOLIO_COMODATO=:f",
                            {'f': folio_com})
                row = cur.fetchone()
                if row:
                    cur.callproc("SP_REGISTRAR_MOVIMIENTO_STOCK",
                        [eq_id, 'SALIDA_COMODATO', 1, ADMIN_ID, None, row[0],
                         f"Comodato {folio_com}"])
            print(f"  OK {folio_com} Pac={pac_id} [{estatus}]")
        conn.commit()

        # ── Resumen ───────────────────────────────────────────────────────────
        print("\n=== RESUMEN FINAL ===")
        for tbl, col in [
            ("DOCTOR",             "COUNT(*)"),
            ("PRODUCTO",           "COUNT(*)"),
            ("PACIENTE",           "COUNT(*)"),
            ("DOCTOR_SERVICIO",    "COUNT(*)"),
            ("DISPONIBILIDAD_DOCTOR","COUNT(*)"),
            ("CITA",               "COUNT(*)"),
            ("VENTA",              "COUNT(*)"),
            ("COMODATO",           "COUNT(*)"),
            ("MOVIMIENTO_INVENTARIO","COUNT(*)"),
        ]:
            cur.execute(f"SELECT COUNT(*) FROM {tbl}")
            print(f"  {tbl}: {cur.fetchone()[0]}")


if __name__ == "__main__":
    seed_all()
    print("\nDone.")
