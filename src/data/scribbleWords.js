import CryptoJS from 'crypto-js';

export const SCRIBBLE_WORDS = [
  // Food & Drinks
  { word: 'PIZZA', category: 'Food', hint: 'Cheesy triangular slices with toppings' },
  { word: 'BURGER', category: 'Food', hint: 'Patty stacked inside a round bun' },
  { word: 'SAMOSA', category: 'Food', hint: 'Crispy golden triangle street snack' },
  { word: 'ICE CREAM', category: 'Food', hint: 'Cold sweet scoop in a waffle cone' },
  { word: 'WATERMELON', category: 'Food', hint: 'Green rind with juicy red inside and black seeds' },
  { word: 'PINEAPPLE', category: 'Food', hint: 'Spiky tropical fruit with a leafy crown' },
  { word: 'CUPCAKE', category: 'Food', hint: 'Mini frosted cake with a cherry on top' },
  { word: 'POPCORN', category: 'Food', hint: 'Crunchy cinema bucket snack' },
  { word: 'NOODLES', category: 'Food', hint: 'Long curly strands eaten with fork or chopsticks' },
  { word: 'DONUT', category: 'Food', hint: 'Sweet glazed ring with sprinkles' },
  { word: 'COFFEE', category: 'Drink', hint: 'Steaming morning mug with roasted aroma' },
  { word: 'MANGO', category: 'Food', hint: 'Sweet golden summer king of fruits' },
  { word: 'BANANA', category: 'Food', hint: 'Curved yellow fruit you peel' },
  { word: 'PANCAKE', category: 'Food', hint: 'Flat breakfast stack with syrup and butter' },
  { word: 'CHOCOLATE', category: 'Food', hint: 'Sweet cocoa bar broken into squares' },

  // Animals & Nature
  { word: 'ELEPHANT', category: 'Animal', hint: 'Giant animal with trunk and floppy ears' },
  { word: 'BUTTERFLY', category: 'Animal', hint: 'Colorful winged insect drawn to flowers' },
  { word: 'PENGUIN', category: 'Animal', hint: 'Tuxedo bird that slides on ice' },
  { word: 'OCTOPUS', category: 'Animal', hint: 'Clever sea creature with eight arms' },
  { word: 'GIRAFFE', category: 'Animal', hint: 'Tallest spotted animal reaching treetops' },
  { word: 'DOLPHIN', category: 'Animal', hint: 'Playful ocean mammal that leaps out of waves' },
  { word: 'PEACOCK', category: 'Animal', hint: 'Royal bird with glowing blue-green fan feathers' },
  { word: 'TURTLE', category: 'Animal', hint: 'Slow reptile carrying a dome shell' },
  { word: 'LION', category: 'Animal', hint: 'Wild cat crowned with a fluffy mane' },
  { word: 'FLAMINGO', category: 'Animal', hint: 'Tall pink bird standing on one leg' },
  { word: 'RAINBOW', category: 'Nature', hint: 'Seven colored arc shining after rain' },
  { word: 'VOLCANO', category: 'Nature', hint: 'Mountain erupting glowing red lava' },
  { word: 'WATERFALL', category: 'Nature', hint: 'River cascading straight down a rocky cliff' },
  { word: 'SNOWMAN', category: 'Winter', hint: 'Frosty figure with carrot nose and scarf' },
  { word: 'CACTUS', category: 'Nature', hint: 'Spiky green desert plant with arms' },
  { word: 'SUNFLOWER', category: 'Nature', hint: 'Bright yellow petals around a dark seed circle' },
  { word: 'LIGHTNING', category: 'Nature', hint: 'Electric zigzag flash across storm clouds' },
  { word: 'TORNADO', category: 'Nature', hint: 'Spinning funnel storm cloud touching ground' },
  { word: 'MOONLIGHT', category: 'Nature', hint: 'Night sky glow above silver clouds' },

  // Everyday Objects
  { word: 'UMBRELLA', category: 'Object', hint: 'Foldable canopy held overhead in rain' },
  { word: 'GUITAR', category: 'Music', hint: 'Six-string wooden instrument you strum' },
  { word: 'CAMERA', category: 'Tech', hint: 'Lens gadget that snaps photos with a flash' },
  { word: 'HEADPHONES', category: 'Music', hint: 'Cushioned audio arc worn over both ears' },
  { word: 'TELESCOPE', category: 'Science', hint: 'Tripod optical tube aimed at distant stars' },
  { word: 'BACKPACK', category: 'Object', hint: 'Zippered travel bag with twin shoulder straps' },
  { word: 'HOURGLASS', category: 'Object', hint: 'Sand timer shaped like a pinched glass figure' },
  { word: 'DIAMOND', category: 'Gem', hint: 'Sparkling faceted jewel that shines in light' },
  { word: 'COMPASS', category: 'Travel', hint: 'Pocket dial pointing steadily to North' },
  { word: 'KEYCHAIN', category: 'Object', hint: 'Metal ring holding house and car keys' },
  { word: 'CANDLE', category: 'Object', hint: 'Melting wax stick crowned with a tiny flame' },
  { word: 'LANTERN', category: 'Object', hint: 'Portable glowing lamp with a carry handle' },
  { word: 'TROPHY', category: 'Award', hint: 'Golden cup raised high by champions' },
  { word: 'ALARM CLOCK', category: 'Object', hint: 'Twin-bell bedside ticker that wakes you up' },
  { word: 'SUNGLASSES', category: 'Fashion', hint: 'Tinted eyewear for bright sunny days' },
  { word: 'MICROPHONE', category: 'Music', hint: 'Stage stick used by singers and RJs' },
  { word: 'PAINTBRUSH', category: 'Art', hint: 'Wooden handle dipped in bright canvas color' },
  { word: 'SUITCASE', category: 'Travel', hint: 'Rolling luggage packed for vacation' },
  { word: 'SCISSORS', category: 'Tool', hint: 'Twin metal blades with finger loops' },
  { word: 'LADDER', category: 'Tool', hint: 'Climbing steps leaned against a wall' },
  { word: 'BICYCLE', category: 'Transport', hint: 'Two-wheeler powered by foot pedals' },
  { word: 'HELICOPTER', category: 'Transport', hint: 'Aircraft lifted by spinning overhead rotors' },
  { word: 'ROCKET', category: 'Space', hint: 'Blast-off ship roaring toward orbit' },
  { word: 'SUBMARINE', category: 'Transport', hint: 'Deep-sea vessel with a periscope tube' },
  { word: 'SAILBOAT', category: 'Transport', hint: 'Ocean vessel pushed by wind in white cloth' },
  { word: 'TRAIN', category: 'Transport', hint: 'Connected coaches rolling down iron tracks' },
  { word: 'AIRPLANE', category: 'Transport', hint: 'Jet wings soaring high above clouds' },
  { word: 'HOT AIR BALLOON', category: 'Travel', hint: 'Colorful floating basket lifted by flame' },

  // Places, Landmarks & Fantasy
  { word: 'LIGHTHOUSE', category: 'Place', hint: 'Tall coastal tower sweeping a beam at night' },
  { word: 'CASTLE', category: 'Place', hint: 'Stone fortress with flags and drawbridge' },
  { word: 'PYRAMID', category: 'Landmark', hint: 'Ancient desert triangle built of giant stones' },
  { word: 'TREEHOUSE', category: 'Place', hint: 'Cozy wooden cabin built high in branches' },
  { word: 'IGLOO', category: 'Place', hint: 'Domed winter shelter made of ice blocks' },
  { word: 'FERRIS WHEEL', category: 'Fun', hint: 'Giant glowing carnival circle with cabins' },
  { word: 'ROLLER COASTER', category: 'Fun', hint: 'Looping thrill ride track at a theme park' },
  { word: 'TREASURE CHEST', category: 'Adventure', hint: 'Pirate wooden box overflowing with gold coins' },
  { word: 'UNICORN', category: 'Fantasy', hint: 'Magical horse with a spiral forehead horn' },
  { word: 'DRAGON', category: 'Fantasy', hint: 'Winged mythical reptile breathing bright fire' },
  { word: 'ASTRONAUT', category: 'Space', hint: 'Spacewalker floating in a round helmet suit' },
  { word: 'SPACESHIP', category: 'Space', hint: 'Futuristic saucer gliding between planets' },
  { word: 'ROBOT', category: 'Tech', hint: 'Mechanical friend with glowing antenna eyes' },
  { word: 'WIZARD', category: 'Fantasy', hint: 'Pointed-hat spellcaster holding a glowing wand' },
  { word: 'MERMAID', category: 'Fantasy', hint: 'Ocean legend with shimmering fish tail' },
  { word: 'CROWN', category: 'Royal', hint: 'Jeweled golden headpiece worn by royalty' },

  // Sports & Games
  { word: 'CRICKET BAT', category: 'Sport', hint: 'Flat willow blade swung at a bouncing ball' },
  { word: 'BASKETBALL', category: 'Sport', hint: 'Orange bounced ball tossed through a high net' },
  { word: 'FOOTBALL', category: 'Sport', hint: 'Pentagon-patterned sphere kicked toward goalposts' },
  { word: 'BADMINTON', category: 'Sport', hint: 'Racket game rallying a feathered shuttlecock' },
  { word: 'SKATEBOARD', category: 'Sport', hint: 'Four-wheeled street deck ridden standing up' },
  { word: 'BOWLING', category: 'Sport', hint: 'Heavy ball knocking down ten white pins' },
  { word: 'CHESS', category: 'Game', hint: 'Black and white checkered strategy board' },
  { word: 'DICE', category: 'Game', hint: 'Dotted cube rolled for lucky numbers' },
  { word: 'KITE', category: 'Fun', hint: 'Diamond flyer dancing on wind by a string' },

  // Celebrations, Music & Cozy Life
  { word: 'BIRTHDAY CAKE', category: 'Party', hint: 'Layered celebration dessert lit with candles' },
  { word: 'FIREWORKS', category: 'Party', hint: 'Sparkling bursts lighting up the night sky' },
  { word: 'CAMPFIRE', category: 'Outdoor', hint: 'Crackling logs glowing under starry skies' },
  { word: 'PIANO', category: 'Music', hint: 'Black and white keys played with ten fingers' },
  { word: 'DRUMSET', category: 'Music', hint: 'Percussion kit hit with wooden sticks' },
  { word: 'CINEMA', category: 'Entertainment', hint: 'Big glowing theatre screen with rows of seats' },
  { word: 'EARRINGS', category: 'Fashion', hint: 'Sparkling jewelry worn on both ears' },
  { word: 'WATCH', category: 'Fashion', hint: 'Ticking dial strapped around your wrist' },
  { word: 'LAPTOP', category: 'Tech', hint: 'Folding portable screen with a full keyboard' },
  { word: 'SMARTPHONE', category: 'Tech', hint: 'Pocket touch display with app icons' },
  { word: 'PARACHUTE', category: 'Adventure', hint: 'Opened sky canopy floating gently down' },
  { word: 'ANCHOR', category: 'Sea', hint: 'Heavy iron hook dropped from a ship to stay put' },
  { word: 'SNOWFLAKE', category: 'Winter', hint: 'Six-pointed ice crystal falling softly' },
  { word: 'HEART', category: 'Symbol', hint: 'Classic curved emblem of love and warmth' },
  { word: 'TROPHY CUP', category: 'Award', hint: 'Two-handled gleaming prize on a pedestal' },
];

export const normalizeScribbleWord = (raw = '') =>
  String(raw)
    .toUpperCase()
    .replace(/[^A-Z ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 24);

export const hashScribbleWord = (roundId, normalizedWord) =>
  CryptoJS.SHA256(`${String(roundId || '')}::${normalizeScribbleWord(normalizedWord)}`).toString();

export const getWordPattern = (normalizedWord = '') =>
  normalizeScribbleWord(normalizedWord)
    .split(' ')
    .filter(Boolean)
    .map((part) => part.length);

export const pickWordChoices = (count = 3) => {
  const pool = [...SCRIBBLE_WORDS];
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, Math.max(1, count));
};
