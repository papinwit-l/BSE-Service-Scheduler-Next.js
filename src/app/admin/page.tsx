import * as navigate from "next/navigation";

type Props = {};

function page({}: Props) {
  navigate.redirect("/admin/dashboard");
  return <div>Redirect to dash board.</div>;
}

export default page;
