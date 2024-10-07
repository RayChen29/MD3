//Handle card methods here pref.

interface Card {
    name:string;
    type:string; //Action, Property, Money, Reactive
    colors?:string[];//what colors are this card applicable to?
    //tbh not how to to smoothly implement colors or houses/hotels
    currentColor?:number;//should probably be empty at first, but number prob determine what color it is at the moment?
    value:number;
    quantity:number;
    //inSet flag? idk

    // methods?:
}
//TODO: Allow shuffleability of cards. Might not be allowed to be a const down the line.
//each card is defined here.
//todo? implement methods to each card where applicable?
//todo? turn this into a dict and use the name for the key. Is this already a dict?
export const createDeck = (decks:number): Card[] => { //declare amount of decks to smush together; determined by no of players.
    let deck = [];
    for(let i = decks; i >  0; i -=1)
    {
        for(const card of cards)
            {
                for(let i = 0; i < card.quantity; i++)
                    deck.push(card)
            }
    }
    return deck;//todo? make return type a Card[]?
}

export const shuffleDeck = (deck: Card[] = [], discard: Card[] = []): Card[] => { 
    // pile will always be an array, initialized as empty by default
    let pile: Card[] = [...deck, ...discard];  // combine deck and discard into pile

    // shuffle logic
    let newDeck: Card[] = [];
    const pileSize = pile.length;

    for (let i = 0; i < pileSize; i++) {
        const rng = Math.floor(pile.length * Math.random());
        if(rng < pile.length)
            newDeck.push(pile[rng]!);
        pile.splice(rng, 1);  // remove the card from pile to prevent duplicates
    }

    return newDeck;
};


const cards: Card[] = [
//Action cards here
    {name:'dealBreaker',type:'action',value:5,quantity:2},
    {name:'debtCollector',type:'action',value:3,quantity:3},
    {name:'forcedDeal',type:'action',value:3,quantity:4},
    {name:'doubleRent',type:'action',value:1,quantity:2},
    {name:'hotel',type:'action',value:4,quantity:3},
    {name:'house',type:'action',value:3,quantity:3},
    {name:"birthday",type:'action',value:2,quantity:3},
    {name:'sayNo',type:'action',value:4,quantity:3},
    {name:'passGo',type:'action',value:1,quantity:10},
    {name:'slyDeal',type:'action',value:3,quantity:3},

    //Single Color Properties
    //TODO: handle rent breakpoints eventually
    {name:'baltic',type:'property',colors:['brown'],value:1,quantity:1},
    {name:'mediterranean',type:'property',colors:['brown'],value:1,quantity:1},
    {name:'boardwalk',type:'property',colors:['blue'],value:4,quantity:1},
    {name:'parkPlace',type:'property',colors:['blue'],value:4,quantity:1},
    {name:'nCarolina',type:'property',colors:['green'],value:4,quantity:1},
    {name:'pacific',type:'property',colors:['green'],value:4,quantity:1},
    {name:'scranton',type:'property',colors:['green'],value:4,quantity:1},
    {name:'connecticut',type:'property',colors:['sky'],value:1,quantity:1},
    {name:'oriental',type:'property',colors:['sky'],value:1,quantity:1},
    {name:'vermont',type:'property',colors:['sky'],value:1,quantity:1},
    {name:'newYork',type:'property',colors:['orange'],value:2,quantity:1},
    {name:'stJames',type:'property',colors:['orange'],value:2,quantity:1},
    {name:'tennessee',type:'property',colors:['orange'],value:2,quantity:1},
    {name:'stCharles',type:'property',colors:['magenta'],value:2,quantity:1},
    {name:'virginia',type:'property',colors:['magenta'],value:2,quantity:1},
    {name:'states',type:'property',colors:['magenta'],value:2,quantity:1},
    {name:'short',type:'property',colors:['black'],value:2,quantity:1},
    {name:'BnO',type:'property',colors:['black'],value:2,quantity:1},
    {name:'reading',type:'property',colors:['black'],value:2,quantity:1},
    {name:'scrantonRR',type:'property',colors:['black'],value:2,quantity:1},
    {name:'kentucky',type:'property',colors:['red'],value:3,quantity:1},
    {name:'indiana',type:'property',colors:['red'],value:3,quantity:1},
    {name:'illinois',type:'property',colors:['red'],value:3,quantity:1},
    {name:'water',type:'property',colors:['util'],value:2,quantity:1},
    {name:'electric',type:'property',colors:['util'],value:2,quantity:1},
    {name:'ventnor',type:'property',colors:['yellow'],value:3,quantity:1},
    {name:'marvin',type:'property',colors:['yellow'],value:3,quantity:1},
    {name:'atlantic',type:'property',colors:['yellow'],value:3,quantity:1},

    //Wildcard Properties
    {name:'wildGreenBlue',type:'property',colors:['blue','green'],value:4,quantity:1},
    {name:'wildGreenBlack',type:'property',colors:['green','black'],value:2,quantity:1},
    {name:'wildBlackUtil',type:'property',colors:['util','black'],value:2,quantity:1},
    {name:'wildSkyBlack',type:'property',colors:['sky','black'],value:4,quantity:1},
    {name:'wildBrownSky',type:'property',colors:['sky','brown'],value:1,quantity:1},
    {name:'wildProp',type:'property',colors:['blue','green','sky','brown','magenta','orange','yellow','red','black','util'],value:0,quantity:2},
    {name:'wildMagentaOrange',type:'property',colors:['magenta','orange'],value:2,quantity:2},
    {name:'wildRedYellow',type:'property',colors:['yellow','red'],value:3,quantity:2},

    //Rent
    {name:'rentWild',type:'rent',colors:['blue','green','sky','brown','magenta','orange','yellow','red','black','util'],value:3,quantity:3},
    {name:'rentGreenBlue',type:'rent',colors:['blue','green'],value:1,quantity:2},
    {name:'rentBrownSky',type:'rent',colors:['sky','brown'],value:1,quantity:2},
    {name:'rentMagentaOrange',type:'rent',colors:['magenta','orange'],value:1,quantity:2},
    {name:'rentBlackUtil',type:'rent',colors:['util','black'],value:1,quantity:2},
    {name:'rentRedYellow',type:'rent',colors:['yellow','red'],value:1,quantity:2},

    //Money
    {name:'money10',type:'money',value:10,quantity:1},
    {name:'money5',type:'money',value:5,quantity:2},
    {name:'money4',type:'money',value:4,quantity:3},
    {name:'money3',type:'money',value:3,quantity:3},
    {name:'money2',type:'money',value:2,quantity:5},
    {name:'money1',type:'money',value:1,quantity:6},
]

