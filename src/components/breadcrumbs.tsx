import { Link, isMatch, useMatches } from "@tanstack/react-router";
import { Fragment } from "react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "~/components/ui/breadcrumb";

export const Breadcrumbs = () => {
  const matches = useMatches({
    select: (matches) =>
      matches.filter((match) => isMatch(match, "loaderData.crumb")),
  });

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {matches.map((match, i) => {
          const title = match.loaderData?.crumb;

          return (
            <Fragment key={match.id}>
              <BreadcrumbItem>
                {i === matches.length - 1 ? (
                  <BreadcrumbPage className="font-medium">
                    {title}
                  </BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link to={match.fullPath}>{title}</Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
              {i < matches.length - 1 && <BreadcrumbSeparator />}
            </Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
};
