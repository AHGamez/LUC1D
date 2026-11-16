-- Deterministic checks of every percentile and the range endpoints.
DO $$ DECLARE low integer; medium integer; high integer; rare integer; BEGIN
 SELECT count(*) FILTER(WHERE c BETWEEN 10 AND 50), count(*) FILTER(WHERE c BETWEEN 51 AND 200), count(*) FILTER(WHERE c BETWEEN 201 AND 500), count(*) FILTER(WHERE c BETWEEN 501 AND 1000)
 INTO low,medium,high,rare
 FROM (SELECT public.turkey_reward_cents((i+0.5)/100.0,0.5) AS c FROM generate_series(0,99) i) rewards;
 IF low<>80 OR medium<>15 OR high<>4 OR rare<>1 THEN RAISE EXCEPTION 'Wrong weighted odds: %, %, %, %',low,medium,high,rare; END IF;
 IF public.turkey_reward_cents(0,0)<>10 THEN RAISE EXCEPTION 'Minimum must be 0.10 TC'; END IF;
 IF public.turkey_reward_cents(0.999999,0.999999)<>1000 THEN RAISE EXCEPTION 'Maximum must be 10 TC'; END IF;
END $$;