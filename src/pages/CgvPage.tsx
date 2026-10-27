import type { ReactNode } from 'react'

// Conditions générales de vente — VERSION PROVISOIRE, à compléter et faire relire.
// Les passages [entre crochets] sont à remplir.

function Article({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="title-odoo text-[24px] text-brand">ARTICLE {n} — {title.toUpperCase()}</h2>
      <div className="space-y-2 text-[15px] leading-relaxed text-white/85">{children}</div>
    </section>
  )
}

export function CgvPage() {
  return (
    <div className="container-odoo pb-16 pt-8">
      <div className="mx-auto max-w-[820px] space-y-8">
        <header>
          <h1 className="title-odoo text-[clamp(2.2rem,5vw,3.4rem)]">CONDITIONS GÉNÉRALES DE VENTE</h1>
          <p className="mt-2 text-sm text-amber-300">Version provisoire — à compléter et à faire valider avant l'ouverture des paiements réels.</p>
        </header>

        <Article n={1} title="Objet et identification du loueur">
          <p>Les présentes conditions régissent la location de véhicules sans chauffeur proposée par <b>LEON Location PRO</b>, [forme juridique], au capital de [montant], immatriculée au RCS de [ville] sous le numéro [SIRET], dont le siège est situé [adresse], La Réunion (ci-après « le Loueur »), à toute personne physique (ci-après « le Locataire »).</p>
          <p>Toute réservation implique l'acceptation sans réserve des présentes conditions, que le Locataire reconnaît avoir lues avant de payer.</p>
        </Article>

        <Article n={2} title="Conditions pour louer">
          <p>Le conducteur principal et chaque conducteur supplémentaire doivent être âgés d'au moins [21] ans et titulaires depuis au moins [2] ans d'un permis de conduire valide pour la catégorie du véhicule.</p>
          <p>Le Locataire transmet une copie de son permis de conduire et de sa pièce d'identité via le lien sécurisé reçu après la réservation, et présente les originaux lors de la remise des clés, ainsi qu'une carte bancaire à son nom.</p>
        </Article>

        <Article n={3} title="Réservation, prix et paiement">
          <p>Les prix sont indiqués en euros, hors taxes et toutes taxes comprises (TVA de 8,5 % applicable à La Réunion). Ils comprennent la location pour la période choisie, les options sélectionnées et les frais de remise du véhicule au lieu choisi.</p>
          <p>La réservation est ferme après paiement. Le paiement s'effectue en ligne par carte bancaire en une fois, ou en 3 ou 4 fois par l'intermédiaire de notre partenaire Alma, sous réserve de son acceptation et selon ses propres conditions.</p>
          <p>Une facture est adressée par e-mail au Locataire dès le paiement.</p>
        </Article>

        <Article n={4} title="Annulation et modification">
          <p>L'annulation est <b>gratuite jusqu'à 24 heures avant l'heure de départ</b> prévue : le montant payé est intégralement remboursé sur le moyen de paiement utilisé.</p>
          <p>Passé ce délai, ou en cas de non-présentation, le montant de la location reste dû. Toute demande de modification est traitée selon les disponibilités et peut entraîner une différence de prix.</p>
          <p>Conformément à l'article L221-28 12° du Code de la consommation, le droit de rétractation de 14 jours ne s'applique pas aux prestations de location de véhicules fournies à une date déterminée.</p>
        </Article>

        <Article n={5} title="Caution">
          <p>Une caution, dont le montant dépend du véhicule et est indiqué avant le paiement, est demandée au Locataire. Au choix du Locataire, elle est déposée en ligne avant l'arrivée via la plateforme Gando, ou par empreinte bancaire sur le terminal du Loueur lors de la remise des clés.</p>
          <p>La caution n'est pas débitée. Elle est libérée dans un délai de 5 à 7 jours ouvrés après la restitution du véhicule, sous réserve qu'aucun dommage, manque de carburant, retard ou frais (amendes, péages, nettoyage) ne soit constaté. Dans le cas contraire, le Loueur peut prélever tout ou partie de la caution, sur justificatifs.</p>
        </Article>

        <Article n={6} title="Remise et restitution du véhicule">
          <p>Le véhicule est remis au lieu, à la date et à l'heure choisis lors de la réservation. Un état des lieux contradictoire, accompagné de photos, est réalisé au départ ; le contrat de location est alors signé électroniquement par les deux parties. Le contrat signé et les photos sont envoyés au Locataire par e-mail.</p>
          <p>Le véhicule est restitué au lieu et à l'heure convenus, dans l'état où il a été remis et avec le même niveau de carburant. Tout retard non signalé pourra être facturé [montant] par heure entamée ; le carburant manquant est facturé au prix de [montant] par litre.</p>
        </Article>

        <Article n={7} title="Utilisation du véhicule">
          <p>Le véhicule ne peut être conduit que par les conducteurs déclarés, sur les routes de La Réunion, dans le respect du Code de la route. Sont notamment interdits : la sous-location, le transport rémunéré de personnes, la participation à des compétitions et la circulation hors des voies ouvertes à la circulation [sauf véhicules 4x4 sur pistes autorisées].</p>
          <p>Les amendes, péages et frais de fourrière survenus pendant la location sont à la charge du Locataire.</p>
        </Article>

        <Article n={8} title="Assurance et sinistre">
          <p>Les véhicules sont assurés. En cas de dommage, de vol ou d'accident engageant sa responsabilité, le Locataire reste redevable d'une franchise de [montant] €, réduite à [montant] € s'il a souscrit l'option correspondante.</p>
          <p>Tout sinistre doit être déclaré au Loueur sans délai et au plus tard sous 48 heures, avec un constat amiable le cas échéant. Une assistance est joignable 24 h/24 au [numéro].</p>
        </Article>

        <Article n={9} title="Données personnelles">
          <p>Les données collectées (identité, coordonnées, permis, pièce d'identité) servent uniquement à la gestion de la location, à la facturation et au respect des obligations légales. Elles sont conservées dans le logiciel de gestion du Loueur, accessibles à son seul personnel. Les copies de documents d'identité sont supprimées [x mois] après la fin de la location, sauf litige en cours.</p>
          <p>Le Locataire dispose d'un droit d'accès, de rectification et de suppression de ses données en écrivant à [adresse e-mail].</p>
        </Article>

        <Article n={10} title="Réclamations, médiation et droit applicable">
          <p>Toute réclamation est à adresser à [adresse e-mail]. En cas de litige non résolu, le Locataire peut recourir gratuitement au médiateur de la consommation : [nom et coordonnées du médiateur].</p>
          <p>Les présentes conditions sont soumises au droit français.</p>
        </Article>
      </div>
    </div>
  )
}
