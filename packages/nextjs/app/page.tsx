"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { DappData, getAllDapps } from "~~/contracts/contractCalls";
import { DappRating, fetchDappRatings } from "~~/utils/graphQL/fetchFromSubgraph";

type RatingsMap = { [dappId: string]: number };

const Home = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [dapps, setDapps] = useState<DappData[] | undefined>(undefined);
  const [allDapps, setAllDapps] = useState<DappData[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      console.log("Fetching data...");
      try {
        setLoading(true);

        const dappData = await getAllDapps();
        let ratingsMap: RatingsMap = {};
        console.log(dappData);
        if (dappData) {
          try {
            const ratingsData = await fetchDappRatings();
            if (ratingsData && ratingsData.data) {
              console.log(ratingsData.data.dappRatingSubmitteds);
              ratingsMap = computeAverageRatings(ratingsData.data.dappRatingSubmitteds);
              console.log(ratingsMap);
            }
          } catch (ratingsError) {
            console.error("Error fetching ratings:", ratingsError);
          }

          const enrichedDapps = dappData.map((dapp: any) => ({
            ...dapp,
            averageRating: ratingsMap[dapp.dappId] ?? 0,
          }));
          setAllDapps(enrichedDapps);
          setDapps(enrichedDapps);
        } else {
          setError("No DApp data returned");
        }
      } catch (err) {
        setError("An error occurred while fetching DApp data");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    const filteredDapps = allDapps?.filter(dapp => dapp.name.toLowerCase().includes(searchTerm.toLowerCase()));
    setDapps(filteredDapps);
  }, [searchTerm, allDapps]);

  function computeAverageRatings(submittedRatings: DappRating[]): RatingsMap {
    const ratings: RatingsMap = {};
    const counts: { [key: string]: number } = {};

    submittedRatings.forEach(({ dappId, starRating }) => {
      if (ratings[dappId]) {
        ratings[dappId] += starRating;
        counts[dappId] += 1;
      } else {
        ratings[dappId] = starRating;
        counts[dappId] = 1;
      }
    });

    for (const dappId in ratings) {
      ratings[dappId] = ratings[dappId] / counts[dappId];
    }

    return ratings;
  }

  const renderStars = (averageRating: number) => {
    const roundedRating = Math.round(averageRating);
    return [...Array(5)].map((_, i) => (
      <span key={i} style={{ color: i < roundedRating ? "gold" : "grey", fontSize: "24px" }}>
        ★
      </span>
    ));
  };

  return (
    <div className="flex flex-col items-center pt-10">
      <div className="px-5 text-center">
        <h1 className="text-4xl font-bold" style={{ color: "#7e5bc2" }}>
          Rate your experience with Farcaster!
        </h1>
        <p className="text-2xl my-2 font-medium">Search for a project:</p>
        <div className="flex justify-center mt-4">
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Enter project name"
            className="w-full max-w-md px-4 py-2 border-2 rounded focus:outline-none focus:border-[#7e5bc2] shadow"
            style={{ borderColor: "#7e5bc2", boxShadow: `0 0 5px #7e5bc2` }}
          />
        </div>
      </div>

      <div className="w-full px-5 mt-6">
        {loading ? (
          <p className="text-center">Loading...</p>
        ) : error ? (
          <p className="text-center text-red-500">{error}</p>
        ) : dapps && dapps.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {dapps
              .slice()
              .sort((a, b) => (b.averageRating ?? 0) - (a.averageRating ?? 0))
              .filter(dapp => dapp.platform.toLowerCase() === "farcaster")
              .map(dapp => (
                <div
                  key={dapp.dappId}
                  className="border rounded-lg p-4 shadow hover:shadow-lg transition-shadow flex flex-col items-center"
                >
                  <div className="w-12 h-12 mb-2 flex items-center justify-center">
                    {dapp.imageUrl && (
                      <img
                        src={dapp.imageUrl}
                        alt={`${dapp.name} icon`}
                        className="max-w-full max-h-full object-contain"
                        onError={e => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    )}
                  </div>
                  <h3 className="font-semibold text-lg text-center" style={{ color: "#7e5bc2" }}>
                    {dapp.name}
                  </h3>
                  <p className="text-center mb-4">{dapp.description}</p>
                  <div className="text-yellow-500">{renderStars(dapp.averageRating ?? 0)}</div>
                  <div className="flex justify-between items-center w-full mt-2">
                    <a href={dapp.url} className="text-blue-500 hover:underline" style={{ color: "#7e5bc2" }}>
                      Visit Site
                    </a>
                    <a
                      href={`/rate-dapp?dappId=${dapp.dappId}`}
                      className="text-blue-500 hover:underline"
                      style={{ color: "#7e5bc2" }}
                    >
                      Rate This App
                    </a>
                  </div>
                </div>
              ))}
          </div>
        ) : (
          <div className="text-center mt-4">
            <p>
              Can&apos;t find what you&apos;re looking for?{" "}
              <Link href="/register-project" className="text-red-500 hover:underline" style={{ color: "#7e5bc2" }}>
                Register a new project
              </Link>
              .
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;
