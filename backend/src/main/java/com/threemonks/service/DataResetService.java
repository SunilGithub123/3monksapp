package com.threemonks.service;

import com.threemonks.repository.*;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class DataResetService {

    private static final Logger logger = LoggerFactory.getLogger(DataResetService.class);

    private final OrderItemRepository orderItemRepository;
    private final OrderRepository orderRepository;
    private final PurchaseRepository purchaseRepository;
    private final StockHistoryRepository stockHistoryRepository;
    private final StockRepository stockRepository;
    private final FeedbackRepository feedbackRepository;
    private final FranchiseEnquiryRepository franchiseEnquiryRepository;
    private final EmployeeRepository employeeRepository;

    @Transactional
    public void resetOrders() {
        long itemCount = orderItemRepository.count();
        long orderCount = orderRepository.count();
        orderItemRepository.deleteAll();
        orderRepository.deleteAll();
        logger.warn("DATA RESET: Deleted {} order items and {} orders", itemCount, orderCount);
    }

    @Transactional
    public void resetPurchases() {
        long count = purchaseRepository.count();
        purchaseRepository.deleteAll();
        logger.warn("DATA RESET: Deleted {} purchases", count);
    }

    @Transactional
    public void resetStock() {
        long historyCount = stockHistoryRepository.count();
        long stockCount = stockRepository.count();
        stockHistoryRepository.deleteAll();
        stockRepository.deleteAll();
        logger.warn("DATA RESET: Deleted {} stock history and {} stock records", historyCount, stockCount);
    }

    @Transactional
    public void resetFeedbacks() {
        long count = feedbackRepository.count();
        feedbackRepository.deleteAll();
        logger.warn("DATA RESET: Deleted {} feedbacks", count);
    }

    @Transactional
    public void resetFranchiseEnquiries() {
        long count = franchiseEnquiryRepository.count();
        franchiseEnquiryRepository.deleteAll();
        logger.warn("DATA RESET: Deleted {} franchise enquiries", count);
    }

    @Transactional
    public void resetEmployees() {
        long count = employeeRepository.count();
        employeeRepository.deleteAll();
        logger.warn("DATA RESET: Deleted {} employees", count);
    }

    @Transactional
    public void resetAllData() {
        resetOrders();
        resetPurchases();
        resetStock();
        resetFeedbacks();
        resetFranchiseEnquiries();
        resetEmployees();
        logger.warn("DATA RESET: ALL transactional data has been cleared");
    }
}
