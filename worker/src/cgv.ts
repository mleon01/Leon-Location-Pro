// Conditions générales du contrat de location (reprises du modèle LEON Location PRO).
// Chaque article : un titre, puis des paragraphes ; une ligne qui commence par "• " est une puce.
// Pour modifier le texte du contrat, modifiez simplement ce fichier.

export const CGV: { title: string; body: string[] }[] = [
  {
    title: '1. Notre accord',
    body: [
      'En signant ce contrat (sur papier ou électroniquement), vous acceptez ses modalités ainsi que les conditions générales de location jointes et disponibles sur demande.',
      'Pour toute question, contactez-nous à mleonpro01@gmail.com',
      'Les termes « nous » ou « notre » désignent LÉON Mathieu Jean-François (LEON LOCATION PRO), immatriculé au RCS de La Réunion sous le n° 943 641 910. Les termes « vous » ou « votre » désignent le locataire.',
      'Ce contrat lie uniquement vous et nous, même si une tierce partie (comme une assurance) intervient dans le processus. Il constitue l’intégralité de notre accord, remplace toute entente antérieure et exclut toute condition extérieure non expressément acceptée. Il ne peut être modifié qu’avec un accord écrit des deux parties. La monnaie de référence est l’euro (€).',
    ],
  },
  {
    title: '2. Période de location',
    body: [
      'Vous disposez du Véhicule pendant la période convenue. Une prolongation peut être accordée oralement ou par écrit, moyennant un règlement anticipé et une éventuelle caution supplémentaire.',
      'En cas de restitution anticipée, aucun remboursement ne sera effectué si vous avez bénéficié d’une offre spéciale. Les frais seront alors recalculés selon nos tarifs journaliers standards, susceptibles d’être supérieurs à ceux initialement prévus. Vous perdrez également le bénéfice de toute remise conditionnée à une durée minimale.',
      'Nous vous recommandons de nous contacter avant tout retour anticipé afin d’estimer les frais applicables. Sans notre accord, vous ne pouvez modifier ni résilier le contrat de façon unilatérale. Toute modification de la date de retour impactera les frais prévus au paragraphe 6. La résiliation anticipée ne met pas fin aux obligations contractuelles déjà engagées.',
    ],
  },
  {
    title: '3. Utilisation du Véhicule',
    body: [
      'Seuls les conducteurs mentionnés en page 1 du contrat, titulaires d’un permis valide depuis au moins 1 an et présenté en original, sont autorisés à conduire le véhicule. D’autres conducteurs peuvent être ajoutés avec notre accord écrit, sous réserve qu’ils remplissent les conditions requises. Des frais supplémentaires peuvent s’appliquer pour les conducteurs de moins de 25 ans.',
      '− En cas d’utilisation du véhicule par une personne non autorisée (hors cas de force majeure comme un accident ou une hospitalisation), vous serez seul responsable, et toutes les protections souscrites seront annulées.',
      '− Le véhicule ne peut en aucun cas être utilisé dans les situations suivantes :',
      '• Par un conducteur de moins de 23 ans et de moins de 3 ans de permis à la date de la signature du contrat de location ;',
      '• Par un conducteur non autorisé ou sans permis valide (ou non traduit si étranger) ;',
      '• Par un conducteur faisant l’objet, au cours des 5 dernières années, de sanction pénale ou administrative pour alcoolémie / suspension ou annulation de permis / délit de fuite / ni de condamnation pour état d’ivresse ;',
      '• Par un conducteur faisant l’objet, au cours des 3 dernières années, d’une résiliation pour fausse déclaration / sinistralité / non-paiement de primes ;',
      '• Pour une activité rémunérée (location, transport de personnes, taxi) ou pour l’usage professionnel du véhicule ;',
      '• À des fins illégales ou intentionnellement dommageables ;',
      '• Pour des courses, tests de vitesse ou apprentissage de la conduite ;',
      '• Sous l’effet d’alcool, de drogues, de stupéfiants ou de médicaments de niveau 3 ;',
      '• En surcharge (plus de passagers que de ceintures) ou sans dispositifs pour enfants requis ;',
      '• Pour remorquer ou pousser un autre véhicule ;',
      '• En dehors des routes praticables ;',
      '• Pour transporter des marchandises onéreuses, des substances illicites ou dangereuses ;',
      '• De façon négligente, imprudente ;',
      '• De façon en infraction avec la loi ;',
      '• Dans des zones réglementées comme les pistes d’aéroports ou installations militaires.',
    ],
  },
  {
    title: '4. Vos obligations',
    body: [
      '− Vous devez prendre soin du véhicule, de ses clés, accessoires et équipements prêtés. Il doit toujours être verrouillé en cas d’absence.',
      '− Aucune intervention ne doit être faite sur le véhicule sans notre accord. En cas d’autorisation, un remboursement est possible sur présentation de facture.',
      '− Vous devez inspecter le véhicule avant de le prendre en charge et signaler toute anomalie.',
      '− En cas de dysfonctionnement ou voyant allumé, arrêtez immédiatement le véhicule et contactez-nous.',
      '− Le véhicule doit être restitué à la date, l’heure et au lieu convenus, en bon état. Vous restez responsable jusqu’à inspection par un membre de notre équipe :',
      '• 1h après restitution pendant les horaires d’ouverture ;',
      '• 2h après l’ouverture suivante si déposée en dehors des horaires. Il est fortement conseillé de prendre des photos (véhicule, lieu, heure, date). Vous restez responsable si le véhicule est confié à un tiers.',
      '− Vérifiez que vous n’avez laissé aucun effet personnel dans le véhicule. Nous déclinons toute responsabilité en cas de perte ou dommage.',
      '− En signant le contrat, vous reconnaissez être responsable de toute infraction commise avec le véhicule jusqu’à sa restitution, sauf si notre responsabilité est engagée.',
      '− Vous devez utiliser le carburant adapté au véhicule.',
    ],
  },
  {
    title: '5. Responsabilité à l’égard des tiers',
    body: [
      'Le locataire et tout conducteur autorisé de 23 ans et plus bénéficient d’une couverture responsabilité civile selon les règles locales. Cette couverture s’applique aux dommages matériels, corporels ou décès causés à des tiers. Elle est soumise aux conditions et exclusions de notre contrat d’assurance, disponible sur demande. En cas de non-respect de ces conditions, l’assureur peut exercer un recours contre le locataire ou conducteur responsable.',
    ],
  },
  {
    title: '6. Tarifs de location et frais divers',
    body: [
      '− Durée de location : La location est facturée par période de 24h. Toute journée entamée est due. Une tolérance de 29 minutes est accordée au retour ; au-delà, une journée supplémentaire est facturée.',
      '− Frais à votre charge : Vous devez payer :',
      '• Le tarif de location à l’avance, y compris les prolongations ;',
      '• Les frais de livraison ou restitution.',
      '− Autres frais à votre charge :',
      '• Amendes, frais judiciaires, infractions routières ;',
      '• Frais de gestion liés à ces infractions ;',
      '• Frais de recouvrement si décision judiciaire en notre faveur ;',
      '• Frais d’abandon jusqu’à 500 € si le véhicule n’est pas restitué à l’agence d’origine ;',
      '• Frais de nettoyage anormal jusqu’à 200 € ;',
      '• Frais de carburant si niveau inférieur à celui du départ lors de la restitution ;',
      '• Frais de récupération du véhicule en cas de panne due à une erreur du conducteur ;',
      '• Franchise selon le Cf Dispositions générales ;',
      '• Liste non exhaustive : Vol, Incendie, Dommages tous accidents, vandalisme : 300 € de franchise.',
      '− Restitution : En cas de dommage, vol ou perte non imputable à nous ou à un cas de force majeure, vous devrez régler :',
      '1. Les réparations ou le remplacement du véhicule / pièces / accessoires, selon un rapport d’expert ;',
      '2. Les frais fixes suivants : 60 € de frais administratifs ; jusqu’à 75 € pour l’immobilisation selon la catégorie ; jusqu’à 15 jours de location + 150 € si le véhicule est une épave ou perdu ;',
      '3. La valeur du véhicule en cas de vol commis par les membres de votre famille ou vos préposés, ou perte totale ;',
      '4. Les frais de remorquage, gardiennage ou fourrière. Vous restez responsable jusqu’à réparation complète du véhicule ;',
      '5. Les frais liés aux remplacements des pneus (hors jantes) en cas de crevaison ou d’usure inhabituelle causés par votre conduite ;',
      '6. Le montant de la franchise mentionnée dans le présent contrat à hauteur des réparations à entreprendre sur le véhicule loué.',
      '− Taxes : Tous les montants incluent la TVA applicable. Vous êtes redevable des frais même s’ils sont réglés par un tiers. En cas d’impayé, nous pourrons débiter votre carte (si utilisée comme dépôt), après vous en avoir informé.',
      '− Professionnels : En cas de retard de paiement, des pénalités de 3,5 fois le taux légal s’appliqueront ainsi que 40 € de frais de recouvrement qui seront exigibles à compter du lendemain de l’échéance du paiement.',
    ],
  },
  {
    title: '7. Nos protections complémentaires',
    body: [
      '− Assurance Responsabilité Civile Accident Corporel et Matériel : elle couvre les dommages causés aux tiers par les conducteurs autorisés, selon les termes de la police d’assurance du loueur.',
      '− Défense pénale et recours à la suite d’un accident.',
      '− Forces de la nature : couvre les dommages ayant eu pour cause l’un des événements suivants et non qualifié de catastrophe naturelle : inondation et hautes eaux, éboulement de rochers, chutes de pierres, projection de roches volcaniques, glissement de terrain, grêle, tempête, ouragan, cyclone.',
      '− Brise de glace : couvre le coût du remplacement ou réparation.',
      '− Vol, Incendie, Dommages tous accidents, Vandalisme ;',
      '− Accessoires et Aménagements, Contenu privé et professionnel, Marchandises transportées ;',
      '− Vol isolé des éléments extérieurs ;',
      '− Attentats et Catastrophes naturelles ;',
      '− Assistance : en cas de panne ou d’accident nécessitant un remorquage du véhicule, il faut appeler le 02 62 20 48 48 et nous informer dans l’immédiat ;',
      '− Protection juridique automobile.',
      'Le contrat d’assurance et le Cf Dispositions générales sont disponibles sur demande et dans le véhicule.',
    ],
  },
  {
    title: '8. Que faire si le véhicule est impliqué dans un accident, volé ou perdu',
    body: [
      '− Tout accident, vol ou sinistre doit être signalé dans les 2 jours ouvrés, par tout moyen, puis confirmé par écrit avec un constat amiable signé et, si nécessaire, un dépôt de plainte ou une déclaration de vol.',
      '− Vous et les conducteurs autorisés devez recueillir les noms et coordonnées des témoins et parties impliquées.',
      '− Vous devez nous transmettre sans délai tout document ou notification liés à une procédure judiciaire.',
      '− Vous acceptez de coopérer pleinement avec nous et nos assureurs (informations, assistance, autorisation d’agir en votre nom si nécessaire).',
      '− La clé du véhicule (et tout dispositif associé) doit être restituée à un membre identifiable de notre personnel.',
    ],
  },
  {
    title: '9. Protection des données',
    body: [
      '− Nous collectons et utilisons vos données personnelles (et celles des conducteurs supplémentaires) pour gérer la location, communiquer avec vous, assurer la sécurité de nos biens et prévenir les fraudes. Certaines données peuvent être conservées en cas d’incident (impayé, vol, dégradation, conduite à risque) pour évaluer le risque de futures locations.',
      '− Le véhicule peut être équipé de systèmes télématiques ou de géolocalisation gérés par le constructeur (OEM). En cas de vol, nous pouvons demander l’accès à ces données.',
      '− Vous êtes responsable d’effacer vos informations personnelles des systèmes embarqués (ex : GPS, Bluetooth).',
      '− Vos données peuvent être partagées avec les autorités, à des fins légales, ou dans le cadre d’une vente ou d’un audit de l’entreprise.',
      '− Les données sont conservées pour une durée limitée, définie selon les obligations légales ou commerciales.',
      '− Vous disposez de droits d’accès, de rectification, de suppression, de limitation et d’opposition concernant vos données.',
      '− Pour toute question, vous pouvez nous contacter à : mleonpro01@gmail.com.',
    ],
  },
  {
    title: '10. Fin du Contrat',
    body: [
      '– Vous pouvez restituer le véhicule et mettre fin au contrat à tout moment, conformément au paragraphe 2.',
      '– Nous pouvons résilier immédiatement le contrat en cas de violation grave, notamment des paragraphes 3, 4 ou 6.',
      '– En cas de non-restitution du véhicule et des équipements prêtés après résiliation, nous pourrons le récupérer à vos frais.',
      '– La résiliation n’annule pas les droits ou obligations en cours. En cas d’utilisation après résiliation, le véhicule pourra être déclaré volé sans que nous en soyons responsables.',
    ],
  },
  {
    title: '11. Indemnisation',
    body: [
      'Vous acceptez, dans les limites de la loi, de nous indemniser pour tout dommage, perte ou plainte liés à l’utilisation du véhicule (sauf en cas de force majeure ou de notre faute). Si vous avez une assurance, vous devez la solliciter en priorité ; sinon, vous devrez nous rembourser directement.',
    ],
  },
  {
    title: '12. Réclamations, commentaires et plaintes',
    body: ['Pour toutes réclamations veuillez transmettre votre demande par courriel à mleonpro01@gmail.com.'],
  },
  {
    title: '13. Notifications',
    body: ['Nos communications sont valables si envoyées à vos coordonnées fournies dans le contrat. Les vôtres le sont lorsqu’elles nous parviennent à l’adresse indiquée en page 1 ou à notre adresse.'],
  },
  {
    title: '14. Droit applicable',
    body: [
      'Le présent Contrat est régi par le droit français et tout litige qui ne pourrait être réglé de façon amiable doit être soumis au jugement des tribunaux français. Dans le Contrat, toute référence à une loi ou à une obligation légale est une référence à sa version amendée, complétée ou re-promulguée et comprend toute législation accessoire relative à cette loi ou à cette obligation légale. Dans le paragraphe 14, « litiges » comprend les litiges contractuels et les litiges non-contractuels.',
    ],
  },
]
