let NostrClient = {
  relays: [],
  pool: null,
  activeSubscriptions: new Map(),
  init: async function () {
    try {
      this.relays = app.relays || [];
      if (this.pool) return true;

      this.pool = new window.NostrTools.SimplePool();
      console.log("Nostr client initialized using SimplePool");
      return true;
    } catch (error) {
      console.error("Failed to initialize Nostr client:", error);
      return false;
    }
  },

  ensureValidRelays: function () {
    this.relays = (app.relays || []).filter((url) => {
      try {
        new URL(url);
        return true;
      } catch {
        console.warn(`Invalid relay URL removed: ${url}`);
        return false;
      }
    });

    if (this.relays.length === 0) {
      console.error("No valid relays configured");
      return false;
    }
    return true;
  },

  getEvents: async function (options = {}) {
    let {
      kinds = [21],
      limit = 5,
      author = null,
      authors = null,
      id = null,
      ids = null, // Add this parameter
      tags = null,
      since = null,
      maxWait = 5000,
      timeout = 7000,
    } = options;

    if (!this.ensureValidRelays()) return id ? null : [];
    if (!this.pool) await this.init();

    try {
      let filter = { kinds, limit };

      if (author) filter.authors = [author];
      if (authors) filter.authors = authors;
      if (id) filter.ids = [id];
      if (ids) filter.ids = ids; // Add this line to handle multiple IDs
      if (since) filter.since = since;
      if (tags) {
        for (let [tag, values] of Object.entries(tags)) {
          filter[`#${tag}`] = Array.isArray(values) ? values : [values];
        }
      }

      console.log(`Fetching events with options:`, options);
      console.log(`Using filter:`, filter);

      // Single event retrieval (id provided, not ids array)
      if (id && !ids) {
        console.time(`NostrFetch:${id}`);

        let event = await this.pool
          .get(this.relays, filter, {
            maxWait: maxWait,
          })
          .catch((e) => {
            console.error(`Error getting event with ID ${id}:`, e);
            return null;
          });

        console.timeEnd(`NostrFetch:${id}`);

        if (!event) {
          console.warn(`No event found with id: ${id}`);
        } else {
          console.log(`Event found:`, event);
        }

        return event;
      }

      // Multiple events retrieval
      return new Promise((resolve) => {
        let events = [];
        let timeoutId;
        let startTime = Date.now();
        let sub;

        const handleCompletion = () => {
          if (timeoutId) clearTimeout(timeoutId);
          if (sub) {
            console.log("Explicitly closing subscription");
            sub.close();
          }

          let duration = Date.now() - startTime;
          console.log(
            `Completed in ${duration}ms with ${events.length} events`
          );
          resolve(events);
        };

        timeoutId = setTimeout(() => {
          console.warn(
            `Timeout reached after ${timeout}ms, returning ${events.length} events so far`
          );
          handleCompletion();
        }, timeout);

        try {
          sub = this.pool.subscribeManyEose(this.relays, filter, {
            onevent: (event) => {
            //  console.log(`Received event kind ${event.kind}:`, event);
              events.push(event);
            },
            onclose: () => {
              console.log("Subscription closed");
              handleCompletion();
            },
            oneose: () => {
              console.log("End of stored events reached");
              handleCompletion();
            },
            maxWait: maxWait,
          });
        } catch (error) {
          console.error("Subscription error:", error);
          handleCompletion();
        }
      });
    } catch (error) {
      console.error("Error fetching events:", error);
      return id ? null : [];
    }
  },

  getEventsFromRelays: async function (relays, options = {}) {
    let {
      kinds = [21],
      limit = 5,
      author = null,
      authors = null,
      id = null,
      ids = null,
      tags = null,
      maxWait = 5000,
      timeout = 7000,
    } = options;

    if (!this.pool) await this.init();

    try {
      let filter = { kinds, limit };

      if (author) filter.authors = [author];
      if (authors) filter.authors = authors;
      if (id) filter.ids = [id];
      if (ids) filter.ids = ids;
      if (tags) {
        for (let [tag, values] of Object.entries(tags)) {
          filter[`#${tag}`] = Array.isArray(values) ? values : [values];
        }
      }

      console.log(
        `Fetching events from ${relays.length} relays with filter:`,
        filter
      );

      // Single event retrieval (id provided, not ids array)
      if (id && !ids) {
        let event = await this.pool
          .get(relays, filter, { maxWait: maxWait })
          .catch((e) => {
            console.error(`Error getting event with ID ${id}:`, e);
            return null;
          });
        return event;
      }

      // Multiple events retrieval
      return new Promise((resolve) => {
        let events = [];
        let timeoutId;
        let startTime = Date.now();
        let sub;

        const handleCompletion = () => {
          if (timeoutId) clearTimeout(timeoutId);
          if (sub) {
            console.log("Explicitly closing subscription");
            sub.close();
          }

          let duration = Date.now() - startTime;
          console.log(
            `Completed in ${duration}ms with ${events.length} events from ${relays.length} relays`
          );
          resolve(events);
        };

        timeoutId = setTimeout(() => {
          console.warn(
            `Timeout reached after ${timeout}ms, returning ${events.length} events so far`
          );
          handleCompletion();
        }, timeout);

        try {
          sub = this.pool.subscribeManyEose(relays, filter, {
            onevent: (event) => {
            //  console.log(`Received event kind ${event.kind}:`, event);
              events.push(event);
            },
            onclose: () => {
              console.log("Subscription closed");
              handleCompletion();
            },
            oneose: () => {
              console.log("End of stored events reached");
              handleCompletion();
            },
            maxWait: maxWait,
          });
        } catch (error) {
          console.error("Subscription error:", error);
          handleCompletion();
        }
      });
    } catch (error) {
      console.error("Error fetching events from relays:", error);
      return id ? null : [];
    }
  },

  getVideos: function (limit = 5) {
    console.log(`Getting videos with limit ${limit}`);
    return this.getEvents({ kinds: [21], limit });
  },

  getVideosByAuthor: function (limit = 10, pk) {
    console.log(
      `Getting videos by author ${pk.slice(0, 8)}... with limit ${limit}`
    );
    return this.getEvents({ kinds: [21, 22], limit, author: pk });
  },

  getVideo: function (id) {
    console.log(`Getting video with id ${id}`);
    return this.getEvents({ kinds: [21], id });
  },

  getComments: function (id, limit = 7) {
    console.log(`Getting comments for ${id} with limit ${limit}`);
    return this.getEvents({
      kinds: [1111],
      limit,
      // currently unrelated comments
      //     tags: id ? { e: id } : null
    });
  },

  getLikedVideosByUser: async function (userPubkey, limit = 100) {
    try {
      console.log(
        `Fetching liked videos for user: ${userPubkey.slice(0, 8)}...`
      );

      // Create a more specific filter to get only video reactions
      let filter = {
        kinds: [7],
        authors: [userPubkey],
        limit: limit,
      };

      // Try with k tag filtering first
      let reactions = [];
      try {
        reactions = await this.getEvents({
          ...filter,
          tags: { k: ["21", "22"] },
        });
        console.log(
          `Direct k-tag filtering found ${reactions.length} reactions`
        );
      } catch (error) {
        console.warn("K-tag filtering failed, trying without:", error);
      }

      // Fallback: get all reactions and filter manually
      if (reactions.length === 0) {
        let allReactions = await this.getEvents(filter);
        console.log(
          `Got ${allReactions.length} total reactions, filtering for videos...`
        );

        reactions = allReactions.filter((reaction) => {
          // Check for k tags indicating video content
          let kTags = reaction.tags.filter(
            (tag) => tag[0] === "k" && (tag[1] === "21" || tag[1] === "22")
          );
          if (kTags.length > 0) return true;

          // If no k tag, check if the reaction content suggests it's a like
          // and has an 'e' tag (could be a video)
          let hasETag = reaction.tags.some((tag) => tag[0] === "e");
          let isLike =
            reaction.content === "+" ||
            reaction.content === "🤙" ||
            reaction.content === "❤️";

          return hasETag && isLike;
        });

        console.log(
          `Filtered to ${reactions.length} potential video reactions`
        );
      }

      if (reactions.length === 0) {
        return [];
      }

      // Extract video IDs with deduplication and time tracking
      let videoMap = new Map();

      reactions.forEach((reaction) => {
        let eTags = reaction.tags.filter((tag) => tag[0] === "e");

        if (eTags.length > 0) {
          // Get the referenced video ID (last e-tag per Nostr convention)
          let videoId = eTags[eTags.length - 1][1];

          if (videoId && videoId.length === 64) {
            // Basic validation for event ID format
            let existing = videoMap.get(videoId);
            if (!existing || reaction.created_at > existing.reactionTime) {
              videoMap.set(videoId, {
                reactionTime: reaction.created_at,
                reaction: reaction,
              });
            }
          }
        }
      });

      let videoIds = Array.from(videoMap.keys());
      console.log(`Processing ${videoIds.length} unique video IDs`);

      if (videoIds.length === 0) {
        return [];
      }

      // Fetch videos in batches
      let videos = [];
      const batchSize = 20;

      for (let i = 0; i < videoIds.length; i += batchSize) {
        let batch = videoIds.slice(i, i + batchSize);

        try {
          let batchVideos = await this.getEvents({
            kinds: [21, 22],
            ids: batch, // This should now work correctly
            limit: batch.length,
          });

          videos.push(...(batchVideos || []));
        } catch (error) {
          console.error(`Batch ${i / batchSize + 1} failed:`, error);
        }
      }

      // Sort by reaction time
      videos.sort((a, b) => {
        let dataA = videoMap.get(a.id);
        let dataB = videoMap.get(b.id);
        return (dataB?.reactionTime || 0) - (dataA?.reactionTime || 0);
      });

      console.log(`Successfully loaded ${videos.length} liked videos`);
      return videos;
    } catch (error) {
      console.error("Error in getLikedVideosByUser:", error);
      return [];
    }
  },

  getNotes: function (id, limit = 7) {
    console.log(`Getting comments for ${id} with limit ${limit}`);
    return this.getEvents({
      kinds: [1],
      limit,
      // tags: { t: "asknostr" }
    });
  },

  getProfile: async function (pk) {
    if (!this.ensureValidRelays()) return null;
    if (!this.pool) await this.init();

    try {
      console.log(`Getting profile for pubkey ${pk}`);

      // Static relays that are known to be good for profile lookups
      let staticRelays = [
        "wss://relay.nostr.band",
        "wss://nos.lol",
        "wss://nostr.mom",
      ];
      console.log(`Static relays (${staticRelays.length}):`, staticRelays);

      // Get optimized relays for this pubkey using Nostr-Gadgets
      let optimizedRelays = [];
      try {
        const hints = window.NostrGadgets.global.hints;
        optimizedRelays = await hints.topN(pk, 3);
        //  console.log(
        //    `Optimized relays from hints (${optimizedRelays.length}):`,
        //    optimizedRelays
        //  );
      } catch (error) {
        console.warn("Failed to get optimized relays for profile:", error);
      }

      console.log(
        `App configured relays (${this.relays.length}):`,
        this.relays
      );

      // Normalize relay URLs to prevent duplicates due to trailing slashes or case differences
      const normalizeUrl = (url) => {
        try {
          return url.toLowerCase().replace(/\/+$/, "");
        } catch (e) {
          return url;
        }
      };

      const allRelays = [
        ...this.relays.map(normalizeUrl),
        ...staticRelays.map(normalizeUrl),
        ...optimizedRelays.map(normalizeUrl),
      ];
      console.log(`Total relays before deduplication: ${allRelays.length}`);

      let combinedRelays = [...new Set(allRelays)];
      console.log(
        `Final deduplicated relays (${combinedRelays.length}):`,
        combinedRelays
      );

      let profileFilter = {
        kinds: [0],
        authors: [pk],
      };

      console.time(`ProfileFetch:${pk.slice(0, 8)}`);
      let profileEvent = await this.pool
        .get(combinedRelays, profileFilter, {
          maxWait: 3000,
        })
        .catch((e) => {
          console.error("Error getting profile:", e);
          return null;
        });
      console.timeEnd(`ProfileFetch:${pk.slice(0, 8)}`);

      if (!profileEvent) {
        console.log("No profile found with pubkey:", pk);
      } else {
        console.log("Profile event found:", profileEvent);
        try {
          JSON.parse(profileEvent.content);
          console.log("Profile content is valid JSON");
        } catch (e) {
          console.warn("Profile content is not valid JSON:", e);
          console.log("Raw content:", profileEvent.content);
        }
      }

      return profileEvent;
    } catch (error) {
      console.error("Error fetching profile:", error);
      return null;
    }
  },

  close() {
    if (this.pool) {
      this.pool.close();
      this.pool = null;
      console.log("Nostr client connection closed");
    }
  },
};

// Clean HTML string and write into our DIV
// const clean = DOMPurify.sanitize(dirty);







async function publishEvent(event, relays = null, options = {}) {
  const {
    requireAllSuccess = false,
    successMessage = "Event published successfully",
    errorMessage = "Failed to publish event"
  } = options;

  let publishResults = [];

  try {
    const targetRelays = relays || app.relays;
    
    if (!targetRelays || targetRelays.length === 0) {
      throw new Error("No relays configured");
    }
    
    if (typeof pool !== "undefined") {
      publishResults = await Promise.allSettled(pool.publish(targetRelays, event));
    } else {
      const simplePool = new window.NostrTools.SimplePool();
      publishResults = await Promise.allSettled(simplePool.publish(targetRelays, event));
    }

    const successfulPublishes = publishResults.filter(result => result.status === 'fulfilled');
    const failedPublishes = publishResults.filter(result => result.status === 'rejected');

/*     if (failedPublishes.length > 0) {
      console.error("Detailed publish failures:");
      failedPublishes.forEach((failure, index) => {
        console.error(`Relay ${index}:`, failure.reason);
      });
    } */

    if (successfulPublishes.length > 0) {
      console.log(`${successMessage} to ${successfulPublishes.length}/${targetRelays.length} relays`);
      
      if (failedPublishes.length > 0) {
        console.warn(`Failed to publish to ${failedPublishes.length} relays:`, 
          failedPublishes.map(f => f.reason));
      }

      return {
        success: true,
        successCount: successfulPublishes.length,
        totalCount: targetRelays.length,
        results: publishResults
      };
    } else {
      throw new Error(`Failed to publish to all ${targetRelays.length} relays`);
    }
    
  } catch (error) {
    console.error(`Error publishing event:`, error);
    
    if (!requireAllSuccess) {
      return {
        success: false,
        error: error.message,
        results: publishResults
      };
    }
    
    throw error;
  }
}