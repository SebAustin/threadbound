# Color means sorting marbles into matching cups

The original design had colored marbles bounce only off threads of their color. IWSDK's Havok integration exposes no collision filtering or contact callbacks, so a per-color thread pass-through cannot be expressed. Instead, colored chutes release amber/azure marbles that only score in a cup of the same color; uncolored cups accept anything. The puzzle becomes routing two streams with shared threads, which kept the "World 2 = color" beat without fighting the engine.
