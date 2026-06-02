/* eslint-disable @typescript-eslint/no-explicit-any */
async function getProducts() {
  const res = await fetch(
    "http://localhost:4000/api/v1/products",
    {
      cache: "no-store"
    }
  );

  return res.json();
}

export default async function Dashboard() {
  const products = await getProducts();

  return (
    <div className="p-10">
      <h1 className="text-3xl font-bold">
        Product Service
      </h1>

      <div className="mt-8 space-y-4 max-w-sm gap-5 flex flex-col">
        {products.map((product: any) => (
          <div
            key={product.id}
            className="border rounded-xl p-4"
          >
            <h2>{product.name}</h2>

            <p>{product.price} BTC</p>
          </div>
        ))}
      </div>
    </div>
  );
}