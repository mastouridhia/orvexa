import { Link } from 'react-router-dom';

// In-app rendering of the legal document set. The canonical source lives in
// legal/CGU.md and legal/Politique-de-confidentialite.md at the repo root; keep
// this text in sync when those change and bump LEGAL_TERMS_VERSION on the API.
const LEGAL_VERSION = 'Version 1.0 — En vigueur le 18 juin 2026';

function LegalShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="login-shell" style={{ alignItems: 'flex-start', padding: '2rem 1rem' }}>
      <article
        className="login-card"
        style={{ maxWidth: 760, width: '100%', lineHeight: 1.6 }}
      >
        <h1 style={{ marginTop: 0 }}>{title}</h1>
        <p style={{ color: 'var(--fg-muted)', fontSize: '0.85rem', marginTop: '-0.5rem' }}>
          {LEGAL_VERSION}
        </p>
        <p style={{ color: 'var(--fg-muted)', fontSize: '0.85rem' }}>
          La version française fait foi. Droit tunisien — tribunaux de Tunis.
        </p>
        {children}
        <hr style={{ margin: '1.5rem 0', border: 0, borderTop: '1px solid var(--border, #e5e7eb)' }} />
        <p style={{ fontSize: '0.85rem' }}>
          <Link to="/terms" style={{ color: 'var(--accent)' }}>
            Conditions d’utilisation
          </Link>
          {' · '}
          <Link to="/privacy" style={{ color: 'var(--accent)' }}>
            Politique de confidentialité
          </Link>
          {' · '}
          Contact : <a href="mailto:orvexatn@gmail.com">orvexatn@gmail.com</a>
        </p>
      </article>
    </div>
  );
}

function H({ children }: { children: React.ReactNode }) {
  return <h2 style={{ fontSize: '1.05rem', marginTop: '1.5rem' }}>{children}</h2>;
}

export function Terms() {
  return (
    <LegalShell title="Conditions Générales d'Utilisation et de Service">
      <p>
        Les présentes Conditions Générales d’Utilisation et de Service (« CGU » ou le « Contrat »)
        constituent un contrat ayant force obligatoire entre <strong>Dhia Eddine Mastouri</strong>, opérateur
        individuel du service Orvexa (« l’Éditeur », « nous »), et toute personne physique ou morale
        qui souscrit ou utilise le service Orvexa (« le Client », « vous »). Toute utilisation du
        Service emporte acceptation pleine et entière des présentes CGU.
      </p>
      <p style={{ marginBottom: 0 }}><strong>Éditeur :</strong></p>
      <ul style={{ marginTop: '0.25rem' }}>
        <li>Nom légal : Dhia Eddine Mastouri (opérateur individuel)</li>
        <li>Pays : Tunisie</li>
        <li>Ville : Sidi Bouzid (Souk Jedid)</li>
        <li>E-mail : <a href="mailto:orvexatn@gmail.com">orvexatn@gmail.com</a></li>
        <li>Site web : orvexa.tn</li>
      </ul>

      <H>1. Définitions</H>
      <p>
        <strong>Service / Plateforme</strong> : la solution logicielle Orvexa fournie en mode SaaS
        (menu numérique, commande par QR code, affichage cuisine, application serveur, tableau de bord
        d’administration, applications associées, API, contenus et documentation).{' '}
        <strong>Client</strong> : le professionnel (restaurant, café, hôtel ou établissement assimilé)
        qui souscrit pour ses besoins professionnels. <strong>Utilisateur</strong> : toute personne
        autorisée par le Client à accéder au Service. <strong>Client final / Convive</strong> : la
        personne qui commande ou consulte le menu via le QR code, sans compte. <strong>Contenu
        Client</strong> : les données, textes, images, logos, menus et prix publiés par le Client.{' '}
        <strong>Formule</strong> : le niveau souscrit (Essentiel, Plus, Pro, Premium).
      </p>

      <H>2. Objet et champ d’application</H>
      <p>
        Les présentes CGU régissent l’accès et l’utilisation d’Orvexa, solution SaaS de commande et de
        gestion en restauration par QR code. Le Service est exclusivement destiné à un{' '}
        <strong>usage professionnel</strong> ; il ne s’adresse pas aux consommateurs au sens du droit
        de la consommation. Le Client déclare souscrire dans le cadre de son activité commerciale.
        Elles s’appliquent à l’exclusion de tout autre document, sauf accord écrit exprès de
        l’Éditeur.
      </p>

      <H>3. Acceptation et opposabilité</H>
      <p>
        L’acceptation s’effectue par le cochage d’une case dédiée lors de la création du compte et/ou
        par l’utilisation du Service. Cette acceptation est <strong>horodatée et conservée</strong> à
        titre de preuve, avec l’indication de la version acceptée. La personne qui accepte déclare
        disposer du pouvoir d’engager le Client. Les CGU opposables sont celles en vigueur à la date
        d’utilisation.
      </p>

      <H>4. Description et évolution du Service</H>
      <p>
        Le Service comprend, selon la Formule : un menu numérique multilingue (arabe, français,
        anglais), la commande par QR code, un affichage cuisine, une application serveur, un tableau de
        bord d’administration et du reporting. Le Service est fourni « <strong>en l’état</strong> » et
        « <strong>selon disponibilité</strong> ». L’Éditeur peut faire évoluer, modifier, suspendre,
        limiter ou retirer tout ou partie des fonctionnalités à tout moment. Certaines fonctionnalités
        peuvent être proposées à titre expérimental (« bêta ») : elles peuvent être modifiées,
        suspendues ou supprimées sans préavis et peuvent comporter des erreurs ou limitations. Le
        Service pourra à l’avenir proposer des fonctionnalités reposant sur l’intelligence artificielle
        (génération de menu, analyses, recommandations) ; les résultats générés automatiquement peuvent
        comporter des erreurs, sont fournis à titre indicatif, et le Client demeure responsable de leur
        vérification avant utilisation.
      </p>

      <H>5. Période d’essai gratuite</H>
      <p>
        L’Éditeur peut proposer une période d’essai gratuite (par exemple quatorze (14) jours) à des
        fins d’évaluation. À l’issue de l’essai, l’accès peut être suspendu en l’absence de
        souscription d’une Formule payante. L’offre d’essai peut être modifiée ou supprimée à tout
        moment.
      </p>

      <H>6. Compte, identifiants et sécurité</H>
      <p>
        L’accès initial s’effectue sur invitation ; le Client choisit un mot de passe et un
        identifiant d’établissement. Le Client est seul responsable de la confidentialité de ses
        identifiants et de ceux de ses Utilisateurs, de toute activité réalisée via son compte, ainsi
        que de la création, de la gestion, des droits et de la révocation des comptes de son personnel.
        Il fournit des informations exactes et à jour, et informe l’Éditeur <strong>sans délai</strong>{' '}
        de toute perte, vol ou utilisation non autorisée d’identifiants, ou de toute faille de
        sécurité.
      </p>

      <H>7. Conditions financières</H>
      <p>
        L’utilisation donne lieu au paiement d’un abonnement selon la Formule, aux tarifs en vigueur en{' '}
        <strong>dinars tunisiens (TND)</strong>, hors taxes le cas échéant, payable d’avance selon la
        périodicité convenue. L’abonnement est renouvelé pour une nouvelle période sur paiement par le
        Client du montant correspondant : aucun prélèvement automatique n’est effectué, et à défaut de
        paiement à l’échéance l’accès peut être suspendu puis résilié. Sauf disposition légale
        impérative ou accord écrit contraire,{' '}
        <strong>les sommes versées ne sont pas remboursables</strong>, y compris en cas de résiliation
        anticipée ou de non-utilisation. En cas de défaut de paiement, l’Éditeur peut, après relance,{' '}
        <strong>suspendre ou restreindre l’accès</strong> sans indemnité et sans préjudice des sommes
        dues. Les tarifs peuvent être modifiés et s’appliquent au renouvellement suivant. Certaines
        fonctionnalités futures pourront être soumises à des conditions particulières ou faire
        intervenir des prestataires de paiement tiers ; ces conditions compléteront alors les présentes
        CGU.
      </p>

      <H>8. Obligations du Client</H>
      <p>
        Le Client utilise le Service conformément aux lois en vigueur. Il est seul responsable de
        l’exactitude, de la licéité et de la mise à jour du Contenu Client (menu, prix, allergènes,
        mentions légales, photos), de la conformité des produits proposés, de la relation commerciale
        avec ses Clients finaux (prise de commande, préparation, encaissement, facturation, qualité,
        hygiène) et de ses propres obligations légales, fiscales et sociales. Orvexa est un{' '}
        <strong>outil de gestion et de mise en relation</strong> : l’Éditeur n’est pas partie aux
        transactions entre le Client et ses Clients finaux et <strong>n’encaisse aucun paiement</strong>{' '}
        pour le compte du Client. Le Client est responsable de l’affichage, de la protection et du bon
        positionnement des QR codes au sein de son établissement, ainsi que de l’utilisation des QR
        codes corrects pour chaque table ou support.
      </p>

      <H>9. Utilisation acceptable (usages interdits)</H>
      <p>
        Sont notamment interdits : utiliser le Service à des fins illégales ou frauduleuses ; publier
        un contenu illicite, diffamatoire, trompeur ou contrefaisant ; accéder sans autorisation à des
        comptes ou systèmes ; contourner les mesures de sécurité ou les limitations de la Formule ;
        décompiler ou rétro-concevoir le Service (sauf limites légales) ; copier, revendre, louer ou
        sous-licencier le Service ; introduire des logiciels malveillants ; surcharger ou perturber le
        Service (scraping massif, déni de service). Tout manquement peut entraîner la suspension ou la
        résiliation immédiate, sans préjudice de dommages-intérêts.
      </p>

      <H>10. Propriété intellectuelle</H>
      <p>
        Le Service, son code, ses interfaces, ses bases de données, ses marques et logos demeurent la
        propriété exclusive de l’Éditeur ; aucune cession n’est consentie. Le Client reçoit un droit
        d’utilisation <strong>personnel, non exclusif, non cessible et révocable</strong>, limité à la
        durée de l’abonnement. Le Client conserve la propriété du Contenu Client et concède à
        l’Éditeur une licence non exclusive, limitée à la durée du Contrat, aux seules fins
        d’héberger, reproduire, afficher et traiter ce Contenu pour fournir le Service, en garantissant
        détenir les droits nécessaires et garantir l’Éditeur contre tout recours de tiers. Les retours
        et suggestions peuvent être librement utilisés par l’Éditeur. Le Client peut demander l’export
        de ses données pendant la durée du Contrat et pendant le délai prévu après la résiliation, au
        format CSV, JSON ou autre format raisonnablement exploitable.
      </p>

      <H>11. Données et confidentialité</H>
      <p>
        Le traitement des données personnelles est décrit dans la{' '}
        <Link to="/privacy" style={{ color: 'var(--accent)' }}>Politique de confidentialité</Link>,
        partie intégrante des présentes CGU. Pour les données saisies par le Client (comptes du
        personnel, commandes), le Client est <strong>responsable de traitement</strong> et l’Éditeur{' '}
        <strong>sous-traitant</strong>. L’Éditeur peut utiliser des données{' '}
        <strong>agrégées et anonymisées</strong> à des fins statistiques et d’amélioration. Chaque
        partie préserve la confidentialité des informations non publiques de l’autre.
      </p>

      <H>12. Prestataires et services tiers</H>
      <p>
        Le Service s’appuie sur des prestataires techniques (hébergement, e-mails) strictement
        nécessaires, listés dans la Politique de confidentialité. Les liens ou intégrations tiers
        éventuels échappent au contrôle de l’Éditeur, qui décline toute responsabilité quant à leur
        contenu ou disponibilité.
      </p>

      <H>13. Disponibilité, maintenance et support</H>
      <p>
        L’Éditeur met en œuvre des <strong>moyens raisonnables</strong> mais <strong>ne garantit aucun
        niveau de service (SLA), aucune disponibilité ininterrompue, ni absence de bugs</strong>.
        Orvexa ne garantit pas une disponibilité continue de 100 %. L’accès peut être suspendu pour
        maintenance ou sécurité. Le support est fourni par e-mail dans
        des délais raisonnables, sans garantie de délai de réponse ou de résolution. L’Éditeur n’est
        pas responsable des interruptions imputables à des tiers, aux équipements ou à la connexion du
        Client, ni à un cas de force majeure. L’Éditeur effectue des sauvegardes raisonnables à des
        fins de continuité de service, sans garantie de restauration dans un délai déterminé ; il
        appartient au Client de conserver ses propres copies du Contenu Client important.
      </p>

      <H>14. Garanties et exclusions</H>
      <p>
        Dans toute la mesure permise par la loi, le Service est fourni « en l’état » et l’Éditeur{' '}
        <strong>exclut toute autre garantie</strong>, expresse ou implicite (adéquation à un usage
        particulier, continuité, exactitude des résultats, absence d’erreurs). Il appartient au Client
        de vérifier l’adéquation du Service à ses besoins et de mettre en place ses propres
        sauvegardes.
      </p>

      <H>15. Limitation de responsabilité</H>
      <p>
        Dans toute la mesure permise par la loi, la responsabilité totale et cumulée de l’Éditeur,
        toutes causes confondues, est <strong>limitée au montant payé par le Client au cours des trois
        (3) mois précédant le fait générateur</strong>. L’Éditeur n’est en aucun cas responsable des{' '}
        <strong>dommages indirects</strong> (perte de chiffre d’affaires, de bénéfices, de clientèle,
        d’exploitation, de données, atteinte à l’image). Ces limitations ne s’appliquent pas en cas de
        faute lourde ou dolosive, ni lorsque la loi impérative l’interdit.
      </p>

      <H>16. Garantie d’éviction et indemnisation</H>
      <p>
        Le Client garantit l’Éditeur et le tient indemne de toute réclamation, action, dommage ou
        condamnation de tiers résultant de l’utilisation du Service par le Client ou ses Utilisateurs,
        du Contenu Client, d’un manquement aux présentes CGU ou à la loi, ou de la relation entre le
        Client et ses Clients finaux.
      </p>

      <H>17. Suspension, durée et résiliation</H>
      <p>
        L’Éditeur peut suspendre l’accès, immédiatement et sans indemnité, en cas de défaut de
        paiement, de manquement aux CGU, d’atteinte à la sécurité ou d’injonction d’une autorité ; la
        suspension ne suspend pas l’obligation de paiement. L’Éditeur se réserve en outre le droit de
        limiter ou suspendre certains usages anormaux susceptibles de compromettre la stabilité ou la
        sécurité du Service, y compris à titre préventif. Le Client peut résilier à tout moment, la
        résiliation prenant effet à la fin de la période en cours, sans remboursement. L’Éditeur peut
        résilier de plein droit en cas de manquement grave non régularisé après mise en demeure, ou
        immédiatement en cas de défaut de paiement persistant ou d’usage illicite. En cas de
        cessation, le Client dispose d’un délai raisonnable pour demander l’export de ses données ;
        passé ce délai, l’Éditeur peut les supprimer ou anonymiser, sous réserve des obligations
        légales. Les clauses ayant vocation à survivre (propriété intellectuelle, confidentialité,
        responsabilité, indemnisation, droit applicable) demeurent en vigueur.
      </p>

      <H>18. Force majeure et stipulations diverses</H>
      <p>
        Aucune partie n’est responsable d’un manquement (hors paiement) résultant d’un cas de force
        majeure (catastrophe naturelle, incendie, panne réseau, défaillance d’un fournisseur essentiel,
        acte d’autorité, conflit, pandémie). Le Client ne peut céder le Contrat sans accord écrit de
        l’Éditeur, qui peut le céder dans le cadre d’une cession d’activité. Si une stipulation est
        jugée nulle, les autres demeurent applicables ; l’absence de réaction à un manquement ne vaut
        pas renonciation. Les présentes CGU et la Politique de confidentialité constituent
        l’intégralité de l’accord. La version française prévaut.
      </p>

      <H>19. Droit applicable et juridiction</H>
      <p>
        Les présentes CGU sont régies par le <strong>droit tunisien</strong>. À défaut de résolution
        amiable, tout litige relève de la compétence <strong>exclusive des tribunaux de Tunis</strong>.
        L’Éditeur peut modifier ces conditions ; la poursuite de l’utilisation vaut acceptation.
      </p>
    </LegalShell>
  );
}

export function Privacy() {
  return (
    <LegalShell title="Politique de confidentialité">
      <p>
        La présente Politique décrit comment <strong>Dhia Eddine Mastouri</strong>, opérateur d’Orvexa
        (orvexatn@gmail.com), collecte, utilise, conserve, partage et protège les données à caractère
        personnel. Pour les données saisies par un restaurant Client (menu, comptes du personnel,
        commandes), le Client est <strong>responsable de traitement</strong> et Orvexa intervient
        comme <strong>sous-traitant</strong>. La politique est conforme au droit tunisien, notamment la
        loi organique n° 2004-63 du 27 juillet 2004.
      </p>

      <H>1. Données que nous collectons</H>
      <p>
        <strong>Client et Utilisateurs :</strong> identité et contact (nom, e-mail, nom de
        l’établissement, rôle) ; données de compte (mot de passe haché, identifiant d’établissement,
        préférences) ; configuration (menu, catégories, prix, tables, paramètres) ; facturation
        (Formule, historique d’abonnement). <strong>Utilisation :</strong> commandes, statuts, appels
        serveur, demandes d’addition, historique ; données techniques (IP, date/heure, journaux,
        appareil, navigateur, identifiants de session).
      </p>
      <p>
        <strong>Clients finaux :</strong> aucun compte n’est créé ; l’accès se fait par scan d’un QR
        code générant une session éphémère. Sont traités le contenu des commandes, la table associée,
        les appels serveur / demandes d’addition et des données techniques minimales (IP, horodatage).
        Orvexa ne demande ni ne collecte de nom, téléphone, e-mail ou moyen de paiement des Clients
        finaux, ni de données sensibles.
      </p>

      <H>2. Finalités et bases légales</H>
      <p>
        Les données servent à fournir, exploiter et sécuriser le Service, authentifier les
        Utilisateurs et gérer les sessions, acheminer les commandes, assurer support et facturation,
        prévenir la fraude, améliorer le Service via des statistiques <strong>agrégées et
        anonymisées</strong>, et respecter nos obligations légales. Les bases légales sont l’exécution
        du contrat, l’intérêt légitime (sécurité, amélioration), le respect d’obligations légales et,
        lorsqu’il est requis, le consentement. Certaines communications liées au fonctionnement du
        Service (réinitialisation de mot de passe, alertes de sécurité, informations essentielles) ne
        peuvent pas être désactivées tant qu’un compte actif existe.
      </p>

      <H>3. Durées de conservation</H>
      <p>
        Compte et configuration : pendant la relation puis une durée raisonnable après la cessation
        (export, obligations légales). Commandes : temps nécessaire à l’exploitation et aux obligations
        comptables. Sessions des Clients finaux : expiration automatique (durée courte). Journaux
        techniques : durée limitée. Facturation : selon les obligations comptables. Au-delà, les
        données sont supprimées ou anonymisées. Les sauvegardes de sécurité peuvent contenir des copies
        résiduelles des données pendant une période limitée avant leur suppression automatique. En cas
        de suppression d’un compte, certaines données peuvent être conservées lorsque leur conservation
        est nécessaire pour satisfaire à des obligations légales, fiscales, comptables ou de sécurité.
      </p>

      <H>4. Destinataires et sous-traitants</H>
      <p>
        Les données ne sont <strong>ni vendues ni louées</strong>. Elles peuvent être accessibles à
        des prestataires techniques strictement nécessaires (hébergement sur serveur dédié exploité par
        l’Éditeur, envoi d’e-mails transactionnels), agissant sur nos instructions et tenus à la
        confidentialité, ou communiquées aux autorités si la loi l’exige. Certains prestataires
        peuvent être situés hors de Tunisie, avec des garanties appropriées.
      </p>

      <H>5. Sécurité et violation de données</H>
      <p>
        Mesures raisonnables : chiffrement des connexions (HTTPS/TLS), hachage des mots de passe,
        contrôle d’accès par rôle, jetons de session à durée limitée, journalisation, sauvegardes et
        séparation des données par établissement. Aucune sécurité n’étant absolue, elle ne peut être
        garantie. En cas de violation présentant un risque, l’Éditeur prend les mesures appropriées et
        procède aux notifications requises dans les meilleurs délais.
      </p>

      <H>6. Vos droits et réclamation</H>
      <p>
        Vous disposez des droits d’<strong>accès, de rectification, de suppression, d’opposition</strong>{' '}
        et d’<strong>export</strong> (au format CSV, JSON ou autre format raisonnablement exploitable) de
        vos données, à exercer à orvexatn@gmail.com (une vérification
        d’identité peut être demandée). Les demandes des Clients finaux d’un restaurant sont en
        principe adressées au restaurant concerné. Vous pouvez saisir l’autorité tunisienne compétente,
        l’Instance Nationale de Protection des Données Personnelles (INPDP) — www.inpdp.tn.
      </p>

      <H>7. Données des mineurs</H>
      <p>
        Le Service n’est pas destiné aux mineurs de moins de 18 ans. Nous ne collectons pas sciemment
        de données personnelles concernant des mineurs. Si vous estimez qu’un mineur nous a fourni des
        données personnelles, veuillez nous contacter afin que nous puissions prendre les mesures
        appropriées.
      </p>

      <H>8. Cookies et décision automatisée</H>
      <p>
        Le Service utilise uniquement des cookies et un stockage local strictement nécessaires
        (authentification, session, langue, panier temporaire). Aucun cookie publicitaire ou de
        pistage tiers à des fins marketing n’est utilisé. Le Service ne met pas en œuvre de décision
        produisant des effets juridiques fondée exclusivement sur un traitement automatisé.
      </p>

      <H>9. Modification</H>
      <p>
        Nous pouvons mettre à jour la présente politique. La version applicable est celle en vigueur
        lors de l’utilisation ; toute modification substantielle est portée à la connaissance du
        Client.
      </p>

      <H>10. Contact</H>
      <p>
        Pour toute question relative à la présente Politique ou au traitement des données personnelles :
      </p>
      <ul>
        <li>Nom légal : Dhia Eddine Mastouri (opérateur individuel)</li>
        <li>Pays : Tunisie</li>
        <li>Ville : Sidi Bouzid (Souk Jedid)</li>
        <li>E-mail : <a href="mailto:orvexatn@gmail.com">orvexatn@gmail.com</a></li>
        <li>Site web : orvexa.tn</li>
      </ul>
      <p>
        Cette Politique doit être lue conjointement avec les{' '}
        <Link to="/terms" style={{ color: 'var(--accent)' }}>Conditions Générales d’Utilisation</Link>.
      </p>
    </LegalShell>
  );
}
