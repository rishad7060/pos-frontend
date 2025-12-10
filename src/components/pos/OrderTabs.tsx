'use client';

import { Button } from '@/components/ui/button';
import { Plus, X } from 'lucide-react';
import type { OrderTab } from '@/types/pos';

interface OrderTabsProps {
    tabs: OrderTab[];
    activeTabId: string;
    onTabSelect: (tabId: string) => void;
    onTabClose: (tabId: string) => void;
    onNewTab: () => void;
    maxTabs?: number;
}

/**
 * Multi-tab order management component
 * Extracted from MultiTabPOS for reusability
 */
export function OrderTabs({
    tabs,
    activeTabId,
    onTabSelect,
    onTabClose,
    onNewTab,
    maxTabs = 5,
}: OrderTabsProps) {
    const canAddTab = tabs.length < maxTabs;

    return (
        <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-lg overflow-x-auto">
            {tabs.map((tab) => {
                const isActive = tab.id === activeTabId;
                const hasItems = tab.cart.length > 0;

                return (
                    <div
                        key={tab.id}
                        className={`
              flex items-center gap-1 px-3 py-1.5 rounded-md cursor-pointer transition-all
              ${isActive
                                ? 'bg-primary text-primary-foreground shadow-sm'
                                : 'hover:bg-muted'
                            }
            `}
                        onClick={() => onTabSelect(tab.id)}
                    >
                        <span className="text-sm font-medium whitespace-nowrap">
                            {tab.name}
                        </span>

                        {hasItems && (
                            <span className={`
                text-xs px-1.5 py-0.5 rounded-full
                ${isActive
                                    ? 'bg-primary-foreground/20 text-primary-foreground'
                                    : 'bg-primary/10 text-primary'
                                }
              `}>
                                {tab.cart.length}
                            </span>
                        )}

                        {/* Close button - don't show on last tab */}
                        {tabs.length > 1 && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onTabClose(tab.id);
                                }}
                                className={`
                  ml-1 p-0.5 rounded-sm hover:bg-destructive/20 hover:text-destructive transition-colors
                  ${isActive ? 'text-primary-foreground/70' : 'text-muted-foreground'}
                `}
                            >
                                <X className="h-3 w-3" />
                            </button>
                        )}
                    </div>
                );
            })}

            {/* Add new tab button */}
            {canAddTab && (
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={onNewTab}
                    title="Add new order tab"
                >
                    <Plus className="h-4 w-4" />
                </Button>
            )}
        </div>
    );
}

/**
 * Generate a unique tab ID
 */
export function generateTabId(): string {
    return `tab-${Date.now()}`;
}

/**
 * Generate tab name based on index
 */
export function generateTabName(index: number): string {
    return `Order ${index + 1}`;
}

/**
 * Create a new empty order tab
 */
export function createOrderTab(index: number): OrderTab {
    return {
        id: generateTabId(),
        name: generateTabName(index),
        cart: [],
        orderDiscount: 0,
        customer: null,
        createdAt: Date.now(),
    };
}
