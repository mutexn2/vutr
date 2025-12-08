let config = {
  defaultMediaServerWhitelist: [
    "nostr.download",
    "video.nostr.build",
    "blossom.primal.net",
    "cdn.nostrcheck.me",
  ],
  relayLists: {
    Default: {
      kind: 30002,
      tags: [
        ["d", "asdasdasdadasdas"],
        ["title", "Default"],
        ["description", "Default Set"],
        ["relay", "wss://nos.lol"],
        ["relay", "wss://relay.damus.io"],
        ["relay", "wss://nostr.mom"],
      ],
    },
    Fast: {
      kind: 30002,
      tags: [
        ["d", "asdasdaszxczcxzxzdadasdas"],
        ["title", "Fast"],
        ["relay", "wss://relay.damus.io"],
        ["relay", "wss://relay.snort.social"],
      ],
    },
    Nostrmom: {
      kind: 30002,
      tags: [
        ["d", "asdasdaszx123123czcxzxzdadasdas"],
        ["title", "Nostrmom"],
        ["relay", "wss://nostr.mom"],
      ],
    },
    Nostrlol: {
      kind: 30002,
      tags: [
        ["d", "asdasdaszxczcxzxzdadasdfgdfgddas"],
        ["title", "Nostrlol"],
        ["relay", "wss://nos.lol"],
      ],
    },
    Robust: {
      kind: 30002,
      tags: [
        ["d", "asdasdaszxczcxzxzdazxczcxvbbbdasdas"],
        ["title", "Robust"],
        ["relay", "wss://nos.lol"],
        ["relay", "wss://relay.nostr.band"],
        ["relay", "wss://relay.damus.io"],
        ["relay", "wss://relay.snort.social"],
        ["relay", "wss://nostr.mom"],
      ],
    },
  },
  defaultRelayList: "Default",

  defaultBookmarkedVideos: {
    id: "local-bookmarks-playlist",
    pubkey: "local",
    created_at: Math.floor(Date.now() / 1000),
    kind: 30005,
    tags: [
      ["d", "my-video-bookmarks"],
      ["title", "My Bookmarks"],
      ["description", "local video bookmarks."],
      ["e", "7f1aa7aeb30712939decd176a49e96f3aae7e9659c3957f0b8b0a88cac0c20a0"],
      ["e", "217f66a167ecbbebde0d8163ff0e81741740345e7fef89c92748f5e404d64fec"],
      ["e", "94ef504244bd3ee02b8ca982b68ec007d44750386765e1a1f44c21b25431547d"],
      ["e", "d50341d5dd971951debf20675330b980aedc13b4939fdd33fc854a95002a205f"],
      ["e", "ec9c975bc63c965900e0a37ae4bc9bce404e6bb4a5dce3f53c4f77e3a707a486"],
    ],
    content: "",
    sig: "local",
  },

  defaultPlaylists: [
    {
      id: "7ae757fa4606f0c39d4dd220ef567b41fc9060c758c4216fe5f8d3df7c57daad",
      pubkey: "local",
      created_at: 1695327657,
      kind: 30005,
      tags: [
        ["d", "7ae757fa4606"],
        ["title", "nostr tutorial"],
        [
          "image",
          "https://cdn.britannica.com/40/188540-050-9AC748DE/Yak-Himalayas-Nepal.jpg",
        ],
        ["description", "Tutorial getting started with nostr series."],
        [
          "e",
          "8ac450661b10082d6d322ac69c4a10b3f66b1a10e8b9d860cfdaf32dbad022c4",
        ],
        [
          "e",
          "40899e6332db0d24ddd62693d89a576e9b724ba7f34013363a3f482ea26351b7",
        ],
        [
          "e",
          "bcd6e1277e0f9b5ef882e206bb6df5375c697cdcd77e00f8857d9f0499692060",
        ],
      ],
      content: "",
      sig: "local",
    },
    {
      id: "567b41fc9060c758c4216f25f8d3df7c57daad7ae757fa4606f0c39d4dd220ef",
      pubkey: "local",
      created_at: 1695329657,
      kind: 30005,
      tags: [
        ["d", "567b41fc9060"],
        ["title", "curated content"],
        [
          "image",
          "https://cdn.britannica.com/40/188540-050-9AC748DE/Yak-Himalayas-Nepal.jpg",
        ],
        ["description", "some curated videos."],

        [
          "e",
          "773211cb828d03ce264f7669dc9fa463b6857f4d4461a7d645f33dd0efcba82c",
        ],
        [
          "e",
          "000089feb98f0352b28c9717c7d9c230854cf88a59d301b0de73fbabbf95c39f",
        ],
        [
          "e",
          "e908e425bf20120926184595aee8fce32be9b834dad3f438b074adefc55d763a",
        ],
        [
          "e",
          "e923c8fbfd72f1842be5037efa217d0e0f66a0580658112192a7bb1b2a2a3e7e",
        ],
        [
          "e",
          "29066c66ae1178b0b2a8a3f61b287256f92ec2974aa4f8551349013b50cfcee5",
        ],        
        [
          "e",
          "1ff44f579ee779a8267577743c1d4b6745c5b448f5674e6d3b75fd926350b5a5",
        ],
      ],
      content: "",
      sig: "local",
    },
    {
      id: "d3df7c57daadc758c4216f25f8d3df7c57daad7ae757fa4606f0c39d4dd220ef",
      pubkey: "local",
      created_at: 1695329657,
      kind: 30005,
      tags: [
        ["d", "my-watch-later"],
        ["title", "Watch later"],
        [
          "image",
          "https://cdn.britannica.com/40/188540-050-9AC748DE/Yak-Himalayas-Nepal.jpg",
        ],
        ["description", "some videos."],
      ],
      content: "",
      sig: "local",
    },
  ],

  defaultBookmarkedPlaylists: [],

  defaultFollowSet: {
    id: "local",
    pubkey: "local",
    created_at: Math.floor(Date.now() / 1000),
    kind: 30000,
    tags: [
      ["d", "localfollows"],
      ["title", "Local-Follows"],
      [
        "image",
        "https://cdn.britannica.com/40/188540-050-9AC748DE/Yak-Himalayas-Nepal.jpg",
      ],
      ["description", "a list of users followed locally."],
      ["p", "e38255bdd8e32e828bbc06a0b3f2014fd7e3d0d9edcd4f5ccce4d4e4c62f753a"],
      ["p", "89b52bfe4c1b7316adcad9d6e88ab37b4983937bc6b09f1c14a3f98795c9f211"],
      ["p", "3bf0c63fcb93463407af97a5e5ee64fa883d107ef9e558472c4eb9aaaefa459d"],
      ["p", "95f17073ed5ea1b0653aa008bf48654650b4234fd87259383d54bdb9a7b2c102"],
      ["p", "92ff2fd4f7ca04d259901ee8b1ae602cf606bb3eeffbe92e32650ba5e1f98758"],
      ["p", "89655035ddc038e44485a28a057a6f3d64e36077b95018b655f9053fc995adb1"],
      ["p", "bf2c5da7435901d9d85ab9e66937fdc7a04333767161042d86089ee1806be811"],
      ["p", "ccbccc02c0be75562148991538cb4a71ab29be9aae9d133a176afa3d75dd5587"],
      ["p", "5c3544bd09023ff4bcad5ad6d758c15db2b20658690fb69292f2fdc81e447f4c"],
    ],
    content: "",
    sig: "local",
  },
  defaultMuteSet: {
    id: "local",
    pubkey: "local",
    created_at: Math.floor(Date.now() / 1000),
    kind: 30007,
    tags: [
      ["d", "21"],
      ["title", "Local-Mutes"],
      [
        "image",
        "https://cdn.britannica.com/40/188540-050-9AC748DE/Yak-Himalayas-Nepal.jpg",
      ],
    ],
    content: "",
    sig: "local",
  },
  favoriteChannels: {
    id: "local-favorites",
    pubkey: "local",
    created_at: Math.floor(Date.now() / 1000),
    kind: 30000,
    tags: [
      ["d", "localfavorites"],
      ["title", "Local-Favorites"],
      [
        "image",
        "https://cdn.britannica.com/40/188540-050-9AC748DE/Yak-Himalayas-Nepal.jpg",
      ],
      ["description", "a list of favorite users locally."],
      ["p", "89b52bfe4c1b7316adcad9d6e88ab37b4983937bc6b09f1c14a3f98795c9f211"],
      ["p", "89655035ddc038e44485a28a057a6f3d64e36077b95018b655f9053fc995adb1"],
      ["p", "ccbccc02c0be75562148991538cb4a71ab29be9aae9d133a176afa3d75dd5587"],
    ],
    content: "",
    sig: "local",
  },

  defaultTheme: "dark",

  appPages: [
    {
      title: "App",
      items: [
        //   { name: "queue", displayName: "Queue", icon: "⚙️" },
        { name: "settings", displayName: "Settings", icon: "⚙️" },
        { name: "kind1home", displayName: "Kind 1s", icon: "⚙️" },
        { name: "localmuted", displayName: "Muted", icon: "⚙️" },
        { name: "historyplaylists", displayName: "Playlist history", icon: "📒" },
        { name: "shorts", displayName: "Shorts", icon: "⚙️" },
        { name: "relaysetsdiscover", displayName: "Relay Sets", icon: "⚙️" },
        { name: "list", displayName: "listview", icon: "📒" },
        { name: "faq", displayName: "faq", icon: "❓" },
        { name: "websockets", displayName: "websockets", icon: "❓" },
        { name: "contact", displayName: "contact", icon: "💬" },
        { name: "nak", displayName: "nak", icon: "🚨" },
        { name: "blob", displayName: "blob", icon: "⚗️" },
        { name: "blossom", displayName: "blossom", icon: "⚗️" },
        { name: "tag", displayName: "tags", icon: "ℹ️" },
        { name: "offline", displayName: "offline", icon: "ℹ️" },
        { name: "nak2", displayName: "nak2", icon: "🔒" },
        { name: "about", displayName: "About", icon: "📄" },
      ],
    },
  ],

  categories: [
    {
      title: "Tag",
      items: [
        { name: "music", displayName: "Music" },
        { name: "gaming", displayName: "Gaming" },
        { name: "news", displayName: "News" },
        { name: "food", displayName: "Food" },
        { name: "education", displayName: "Education" },
        { name: "movies", displayName: "Movies" },
        { name: "comedy", displayName: "Comedy" },
        { name: "sports", displayName: "Sports" },
        { name: "politics", displayName: "Politics" },
        { name: "technology", displayName: "Technology" },
        { name: "documentaries", displayName: "Documentaries" },
      ],
    },
  ],
};
