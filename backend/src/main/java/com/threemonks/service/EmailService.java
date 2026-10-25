package com.threemonks.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailService {

    private final JavaMailSender mailSender;

    private static final String FRANCHISE_TO = "3monks.official@gmail.com";

    @Async
    public void sendFranchiseEnquiryEmail(String name, String email, String phone, String city, String message) {
        try {
            SimpleMailMessage mail = new SimpleMailMessage();
            mail.setTo(FRANCHISE_TO);
            mail.setSubject("New Franchise Enquiry from " + name);
            mail.setText(
                    "New Franchise Enquiry Received\n" +
                            "================================\n\n" +
                            "Name:    " + name + "\n" +
                            "Email:   " + email + "\n" +
                            "Phone:   " + phone + "\n" +
                            "City:    " + city + "\n\n" +
                            "Message:\n" + (message != null ? message : "N/A") + "\n\n" +
                            "---\nThis email was sent from 3Monks website.");
            mail.setFrom("3monks.official@gmail.com");
            mail.setReplyTo(email);
            mailSender.send(mail);
            log.info("Franchise enquiry email sent for: {}", name);
        } catch (Exception e) {
            log.error("Failed to send franchise enquiry email for {}: {}", name, e.getMessage());
        }
    }

    @Async
    public void sendFeedbackNotificationEmail(String name, Integer rating, String message) {
        try {
            SimpleMailMessage mail = new SimpleMailMessage();
            mail.setTo(FRANCHISE_TO);
            mail.setSubject("New Customer Feedback - " + rating + "★ from " + name);
            mail.setText(
                    "New Customer Feedback Received\n" +
                            "================================\n\n" +
                            "Name:    " + name + "\n" +
                            "Rating:  " + "★".repeat(rating) + " (" + rating + "/5)\n\n" +
                            "Message:\n" + (message != null ? message : "N/A") + "\n\n" +
                            "---\nThis email was sent from 3Monks website.");
            mail.setFrom("3monks.official@gmail.com");
            mailSender.send(mail);
            log.info("Feedback notification email sent for: {}", name);
        } catch (Exception e) {
            log.error("Failed to send feedback notification email for {}: {}", name, e.getMessage());
        }
    }
}
