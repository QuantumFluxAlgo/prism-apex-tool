import React from 'react';

export function Card(props: React.HTMLAttributes<HTMLDivElement>) {
  return <div data-testid="card" {...props} />;
}

export function CardHeader(props: React.HTMLAttributes<HTMLDivElement>) {
  return <div data-testid="card-header" {...props} />;
}

export function CardBody(props: React.HTMLAttributes<HTMLDivElement>) {
  return <div data-testid="card-body" {...props} />;
}

export default Card;

